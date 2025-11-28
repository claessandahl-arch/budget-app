import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createTransaction, createIncome, createFixedExpense, createSaving, getImportProfiles, createImportProfile, updateImportProfile, deleteImportProfile, getTransactions, getFixedExpenses, updateFixedExpense, getIncomes, getSavings, updateIncome, updateSaving } from '@/lib/api'
import type { NewTransaction, NewImportProfile, NewIncome, NewFixedExpense, NewSaving, FixedExpense, Income, Saving } from '@/types/database'

// Typ för rå Excel-data
type RawRow = Record<string, unknown>

// Typ för vart transaktionen ska importeras
type ImportTargetType = 'variable' | 'income' | 'fixed' | 'savings' | 'skip'

const TARGET_TYPE_LABELS: Record<ImportTargetType, { label: string; emoji: string; color: string }> = {
  variable: { label: 'Rörlig utgift', emoji: '🛒', color: 'bg-orange-100 text-orange-700' },
  income: { label: 'Inkomst', emoji: '💰', color: 'bg-green-100 text-green-700' },
  fixed: { label: 'Fast utgift', emoji: '🏠', color: 'bg-blue-100 text-blue-700' },
  savings: { label: 'Sparande', emoji: '🐷', color: 'bg-purple-100 text-purple-700' },
  skip: { label: 'Hoppa över', emoji: '⏭️', color: 'bg-slate-100 text-slate-500' },
}

type ColumnMapping = {
  name: string
  sourceType: 'bank' | 'creditcard'
  dateColumn: string
  descriptionColumn: string
  amountColumn: string
  dateFormat: string
  invertAmount: boolean
  headerRow: number  // Vilken rad innehåller kolumnnamnen (0-baserat)
}

// Typ för vad som ska göras med matchande post
type MatchAction = 'update' | 'create' | 'skip'

type ParsedTransaction = {
  date: string
  description: string
  amount: number
  rawRow: RawRow
  isValid: boolean
  errors: string[]
  isDuplicate?: boolean  // Om raden redan finns i någon tabell
  duplicateType?: 'transaction' | 'income' | 'fixed' | 'savings'  // Vilken tabell den hittades i
  targetType: ImportTargetType  // Vart ska transaktionen importeras
  // Matchning för fasta utgifter
  matchingFixedExpense?: FixedExpense
  fixedExpenseAction?: MatchAction
  // Matchning för inkomster
  matchingIncome?: Income
  incomeAction?: MatchAction
  // Matchning för sparanden
  matchingSaving?: Saving
  savingAction?: MatchAction
}

const DEFAULT_MAPPING: ColumnMapping = {
  name: 'Ny profil',
  sourceType: 'bank',
  dateColumn: '',
  descriptionColumn: '',
  amountColumn: '',
  dateFormat: 'YYYY-MM-DD',
  invertAmount: false,
  headerRow: 0,
}

export function Import() {
  // State
  const [rawSheetData, setRawSheetData] = useState<unknown[][]>([])  // Rå matris-data
  const [rawData, setRawData] = useState<RawRow[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [fileName, setFileName] = useState<string>('')
  const [selectedProfileId, setSelectedProfileId] = useState<string>('')
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')
  const [profileNameError, setProfileNameError] = useState<string>('')
  const [editingProfileId, setEditingProfileId] = useState<string>('')  // Om man redigerar befintlig profil
  const [saveProfileAction, setSaveProfileAction] = useState<'update' | 'new'>('new')  // Spara som ny eller uppdatera
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)  // Dialog för bekräftelse av borttagning
  
  // Mappning
  const [mapping, setMapping] = useState<ColumnMapping>(DEFAULT_MAPPING)
  
  // Import state
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([])
  const [selectedForImport, setSelectedForImport] = useState<Set<number>>(new Set())
  const [importStep, setImportStep] = useState<'upload' | 'map' | 'preview' | 'done'>('upload')

  const queryClient = useQueryClient()

  // Hämta sparade profiler från databasen
  const { data: savedProfiles = [] } = useQuery({
    queryKey: ['import-profiles'],
    queryFn: getImportProfiles,
  })

  // Hämta befintliga transaktioner för dubblettkontroll
  const { data: existingTransactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: getTransactions,
  })

  // Hämta befintliga fasta utgifter för matchning
  const { data: existingFixedExpenses = [] } = useQuery({
    queryKey: ['fixed-expenses'],
    queryFn: getFixedExpenses,
  })

  // Hämta befintliga inkomster för matchning
  const { data: existingIncomes = [] } = useQuery({
    queryKey: ['incomes'],
    queryFn: getIncomes,
  })

  // Hämta befintliga sparanden för matchning
  const { data: existingSavings = [] } = useQuery({
    queryKey: ['savings'],
    queryFn: getSavings,
  })

  // Spara eller uppdatera profil mutation
  const saveProfileMutation = useMutation({
    mutationFn: async (data: { profile: NewImportProfile; profileId?: string }) => {
      if (data.profileId) {
        // Uppdatera befintlig profil
        await updateImportProfile(data.profileId, data.profile)
      } else {
        // Skapa ny profil
        await createImportProfile(data.profile)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-profiles'] })
      setSaveDialogOpen(false)
      setNewProfileName('')
      setEditingProfileId('')
      setProfileNameError('')
    },
  })

  // Ta bort profil mutation
  const deleteProfileMutation = useMutation({
    mutationFn: deleteImportProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-profiles'] })
      setSelectedProfileId('')
    },
  })

  // Filuppladdning
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = event.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        
        // Ta första bladet
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        
        // Läs som rå matris (utan att anta headers)
        const matrixData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { 
          header: 1,  // Returnerar array of arrays
          raw: false,
          defval: '' 
        })
        
        if (matrixData.length > 0) {
          setRawSheetData(matrixData)
          // Försök hitta header-raden automatiskt (leta efter "Belopp" eller "Text")
          let headerRowIndex = 0
          for (let i = 0; i < Math.min(matrixData.length, 15); i++) {
            const row = matrixData[i] as string[]
            if (row && row.some(cell => 
              typeof cell === 'string' && 
              (cell.toLowerCase().includes('belopp') || 
               cell.toLowerCase().includes('text') ||
               cell.toLowerCase().includes('datum') ||
               cell.toLowerCase().includes('transaktion'))
            )) {
              headerRowIndex = i
              break
            }
          }
          
          // Sätt header row i mapping
          setMapping(prev => ({ ...prev, headerRow: headerRowIndex }))
          
          // Processa med den hittade header-raden
          processDataWithHeaderRow(matrixData, headerRowIndex)
          setImportStep('map')
        }
      } catch (error) {
        console.error('Fel vid läsning av fil:', error)
        alert('Kunde inte läsa filen. Kontrollera att det är en giltig Excel-fil.')
      }
    }
    reader.readAsBinaryString(file)
  }, [])

  // Processa data baserat på vald header-rad
  const processDataWithHeaderRow = useCallback((matrixData: unknown[][], headerRowIndex: number) => {
    if (matrixData.length <= headerRowIndex) return

    const headerRow = matrixData[headerRowIndex] as string[]
    const cols = headerRow.map((h, i) => String(h || `Kolumn_${i + 1}`).trim())
    
    // Konvertera rader efter header till objekt
    const dataRows: RawRow[] = []
    for (let i = headerRowIndex + 1; i < matrixData.length; i++) {
      const row = matrixData[i] as unknown[]
      if (!row || row.every(cell => !cell)) continue // Hoppa över tomma rader
      
      const obj: RawRow = {}
      cols.forEach((col, idx) => {
        obj[col] = row[idx]
      })
      dataRows.push(obj)
    }

    setColumns(cols.filter(c => c && !c.startsWith('Kolumn_')))
    setRawData(dataRows)
  }, [])

  // Ladda sparad profil
  const handleLoadProfile = (profileId: string) => {
    setSelectedProfileId(profileId)
    if (profileId) {
      const profile = savedProfiles.find(p => p.id === profileId)
      if (profile) {
        const newMapping = {
          name: profile.name,
          sourceType: profile.source_type,
          dateColumn: profile.date_column,
          descriptionColumn: profile.description_column,
          amountColumn: profile.amount_column,
          dateFormat: profile.date_format,
          invertAmount: profile.invert_amount,
          headerRow: profile.skip_rows, // skip_rows används som headerRow
        }
        setMapping(newMapping)
        setEditingProfileId(profileId)  // Mark as editing
        setSaveProfileAction('update')
        setNewProfileName(profile.name)  // Pre-fill the name
        // Omprocessa data med ny header-rad
        if (rawSheetData.length > 0) {
          processDataWithHeaderRow(rawSheetData, profile.skip_rows)
        }
      }
    } else {
      setEditingProfileId('')
      setSaveProfileAction('new')
    }
  }

  // Spara aktuell mappning som profil
  const handleSaveProfile = () => {
    // Validera profilnamn
    if (!newProfileName.trim()) {
      setProfileNameError('Ange ett namn för profilen')
      return
    }

    // Kontrollera om namnet redan finns (om det inte är samma profil som vi redigerar)
    const nameExists = savedProfiles.some(p => 
      p.name.toLowerCase() === newProfileName.toLowerCase() && p.id !== editingProfileId
    )

    if (nameExists) {
      setProfileNameError('Profilnamn redan använt. Välj ett annat namn.')
      return
    }

    setProfileNameError('')

    const profile: NewImportProfile = {
      name: newProfileName,
      source_type: mapping.sourceType,
      date_column: mapping.dateColumn,
      description_column: mapping.descriptionColumn,
      amount_column: mapping.amountColumn,
      date_format: mapping.dateFormat,
      invert_amount: mapping.invertAmount,
      skip_rows: mapping.headerRow, // headerRow sparas som skip_rows
    }

    // Om vi uppdaterar befintlig profil och vill behålla samma namn
    if (editingProfileId && saveProfileAction === 'update') {
      saveProfileMutation.mutate({ profile, profileId: editingProfileId })
    } else {
      // Skapa ny profil
      saveProfileMutation.mutate({ profile })
    }
  }

  // Parsa datum från olika format
  const parseDate = (dateStr: string, format: string): string | null => {
    if (!dateStr) return null
    
    try {
      // Ta bort extra whitespace
      const cleaned = String(dateStr).trim()
      
      if (format === 'YYYY-MM-DD') {
        // Redan rätt format
        if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
          return cleaned
        }
      }
      
      if (format === 'DD/MM/YYYY') {
        const match = cleaned.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
        if (match) {
          return `${match[3]}-${match[2]}-${match[1]}`
        }
      }
      
      if (format === 'DD.MM.YYYY') {
        const match = cleaned.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
        if (match) {
          return `${match[3]}-${match[2]}-${match[1]}`
        }
      }

      // MM/DD/YYYY format (American Express, etc.)
      if (format === 'MM/DD/YYYY') {
        const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
        if (match) {
          const month = match[1].padStart(2, '0')
          const day = match[2].padStart(2, '0')
          const year = match[3]
          return `${year}-${month}-${day}`
        }
      }

      // Försök parsa som Excel-serienummer
      const num = parseFloat(cleaned)
      if (!isNaN(num) && num > 40000 && num < 50000) {
        const date = new Date((num - 25569) * 86400 * 1000)
        return date.toISOString().split('T')[0]
      }

      // Försök parsa med JavaScript Date (hanterar flera format)
      const jsDate = new Date(cleaned)
      if (!isNaN(jsDate.getTime())) {
        // Kontrollera att datumet är rimligt (inte default 1970)
        if (jsDate.getFullYear() > 2000 && jsDate.getFullYear() < 2100) {
          return jsDate.toISOString().split('T')[0]
        }
      }
      
      return null
    } catch {
      return null
    }
  }

  // Parsa belopp
  const parseAmount = (amountStr: unknown, invert: boolean): number | null => {
    if (amountStr === null || amountStr === undefined || amountStr === '') return null
    
    try {
      // Hantera nummer direkt
      if (typeof amountStr === 'number') {
        return invert ? -amountStr : amountStr
      }
      
      // Rensa strängen
      let cleaned = String(amountStr)
        .replace(/\s/g, '')        // Ta bort whitespace
        .replace(/[^\d,.\-]/g, '') // Behåll bara siffror, komma, punkt, minus
        .replace(',', '.')         // Byt komma mot punkt
      
      const amount = parseFloat(cleaned)
      if (isNaN(amount)) return null
      
      return invert ? -amount : amount
    } catch {
      return null
    }
  }

  // Kontrollera om en transaktion redan finns (i transactions-tabellen)
  const checkDuplicateTransaction = (date: string, amount: number, description: string): boolean => {
    if (!date || !amount) return false
    
    const normalizedDescription = description.trim().toLowerCase()
    const normalizedAmount = Math.abs(amount)
    
    return existingTransactions.some(existing => {
      // Jämför datum (exakt match)
      if (existing.date !== date) return false
      
      // Jämför belopp (tolerans på 0.01 för avrundningsfel)
      if (Math.abs(Math.abs(Number(existing.amount)) - normalizedAmount) > 0.01) return false
      
      // Jämför beskrivning (normaliserad, delvis match)
      const existingDesc = (existing.description || '').trim().toLowerCase()
      // Antingen exakt match eller om en beskrivning innehåller den andra
      if (existingDesc === normalizedDescription) return true
      if (existingDesc.includes(normalizedDescription) || normalizedDescription.includes(existingDesc)) {
        // Om beskrivningarna är lika nog (minst 80% match), räkna som dubblett
        const longer = existingDesc.length > normalizedDescription.length ? existingDesc : normalizedDescription
        const shorter = existingDesc.length > normalizedDescription.length ? normalizedDescription : existingDesc
        if (shorter.length / longer.length > 0.8) return true
      }
      
      return false
    })
  }

  // Kontrollera om en rad redan finns i NÅGON tabell (transactions, incomes, fixed_expenses, savings)
  // Returnerar vilken typ av dubblett det är, eller null om ingen dubblett
  const checkDuplicateAnywhere = (date: string, amount: number, description: string): {
    isDuplicate: boolean
    duplicateType?: 'transaction' | 'income' | 'fixed' | 'savings'
    matchingRecord?: unknown
  } => {
    if (!date || !amount) return { isDuplicate: false }
    
    const normalizedDesc = description.trim().toLowerCase()
    const absAmount = Math.abs(amount)
    
    // 1. Kolla transactions (med datum + belopp + beskrivning)
    if (checkDuplicateTransaction(date, amount, description)) {
      return { isDuplicate: true, duplicateType: 'transaction' }
    }
    
    // 2. Kolla incomes (namn + belopp, ignorera datum - det är månadsvis)
    const matchingIncome = existingIncomes.find(inc => {
      const incName = inc.name.trim().toLowerCase()
      const amountMatch = Math.abs(inc.amount - absAmount) < 0.01
      // Exakt match eller partial match på namn + exakt belopp
      return amountMatch && (
        incName === normalizedDesc ||
        incName.includes(normalizedDesc) ||
        normalizedDesc.includes(incName)
      )
    })
    if (matchingIncome) {
      return { isDuplicate: true, duplicateType: 'income', matchingRecord: matchingIncome }
    }
    
    // 3. Kolla fixed_expenses (namn + belopp)
    const matchingFixed = existingFixedExpenses.find(fe => {
      const feName = fe.name.trim().toLowerCase()
      const amountMatch = Math.abs(fe.amount - absAmount) < 0.01
      return amountMatch && (
        feName === normalizedDesc ||
        feName.includes(normalizedDesc) ||
        normalizedDesc.includes(feName)
      )
    })
    if (matchingFixed) {
      return { isDuplicate: true, duplicateType: 'fixed', matchingRecord: matchingFixed }
    }
    
    // 4. Kolla savings (namn + belopp)
    const matchingSaving = existingSavings.find(sav => {
      const savName = sav.name.trim().toLowerCase()
      const amountMatch = Math.abs(sav.amount - absAmount) < 0.01
      return amountMatch && (
        savName === normalizedDesc ||
        savName.includes(normalizedDesc) ||
        normalizedDesc.includes(savName)
      )
    })
    if (matchingSaving) {
      return { isDuplicate: true, duplicateType: 'savings', matchingRecord: matchingSaving }
    }
    
    return { isDuplicate: false }
  }

  // Hitta matchande fast utgift baserat på namn (case-insensitive, fuzzy)
  const findMatchingFixedExpense = (description: string): FixedExpense | undefined => {
    if (!description) return undefined
    
    const normalizedDesc = description.trim().toLowerCase()
    
    // 1. Exakt match (case-insensitive)
    const exactMatch = existingFixedExpenses.find(fe => 
      fe.name.trim().toLowerCase() === normalizedDesc
    )
    if (exactMatch) return exactMatch
    
    // 2. Partial match - om beskrivningen innehåller namnet eller vice versa
    const partialMatch = existingFixedExpenses.find(fe => {
      const feName = fe.name.trim().toLowerCase()
      // "ELLEVIO AB" matchar "Ellevio", "BAHNHOF" matchar "Bahnhof Internet"
      return normalizedDesc.includes(feName) || feName.includes(normalizedDesc)
    })
    if (partialMatch) return partialMatch
    
    // 3. Fuzzy match - första ordet i beskrivningen matchar första ordet i namn
    const firstWordDesc = normalizedDesc.split(/[\s,.-]+/)[0]
    if (firstWordDesc.length >= 4) {  // Minst 4 tecken för att undvika false positives
      const fuzzyMatch = existingFixedExpenses.find(fe => {
        const firstWordFe = fe.name.trim().toLowerCase().split(/[\s,.-]+/)[0]
        return firstWordFe === firstWordDesc || 
               firstWordFe.startsWith(firstWordDesc) || 
               firstWordDesc.startsWith(firstWordFe)
      })
      if (fuzzyMatch) return fuzzyMatch
    }
    
    return undefined
  }

  // Hitta matchande inkomst baserat på namn (case-insensitive, fuzzy)
  const findMatchingIncome = (description: string, amount: number): Income | undefined => {
    if (!description) return undefined
    
    const normalizedDesc = description.trim().toLowerCase()
    const absAmount = Math.abs(amount)
    
    // 1. Exakt match på namn (case-insensitive)
    const exactMatch = existingIncomes.find(inc => 
      inc.name.trim().toLowerCase() === normalizedDesc
    )
    if (exactMatch) return exactMatch
    
    // 2. Partial match - om beskrivningen innehåller namnet eller vice versa
    const partialMatch = existingIncomes.find(inc => {
      const incName = inc.name.trim().toLowerCase()
      return normalizedDesc.includes(incName) || incName.includes(normalizedDesc)
    })
    if (partialMatch) return partialMatch
    
    // 3. Fuzzy match - första ordet + liknande belopp (±20%)
    const firstWordDesc = normalizedDesc.split(/[\s,.-]+/)[0]
    if (firstWordDesc.length >= 3) {
      const fuzzyMatch = existingIncomes.find(inc => {
        const firstWordInc = inc.name.trim().toLowerCase().split(/[\s,.-]+/)[0]
        const amountMatch = Math.abs(inc.amount - absAmount) / Math.max(inc.amount, absAmount) < 0.2
        return (firstWordInc === firstWordDesc || 
                firstWordInc.startsWith(firstWordDesc) || 
                firstWordDesc.startsWith(firstWordInc)) && amountMatch
      })
      if (fuzzyMatch) return fuzzyMatch
    }
    
    return undefined
  }

  // Hitta matchande sparande baserat på namn (case-insensitive, fuzzy)
  const findMatchingSaving = (description: string, amount: number): Saving | undefined => {
    if (!description) return undefined
    
    const normalizedDesc = description.trim().toLowerCase()
    const absAmount = Math.abs(amount)
    
    // 1. Exakt match på namn (case-insensitive)
    const exactMatch = existingSavings.find(sav => 
      sav.name.trim().toLowerCase() === normalizedDesc
    )
    if (exactMatch) return exactMatch
    
    // 2. Partial match - om beskrivningen innehåller namnet eller vice versa
    const partialMatch = existingSavings.find(sav => {
      const savName = sav.name.trim().toLowerCase()
      return normalizedDesc.includes(savName) || savName.includes(normalizedDesc)
    })
    if (partialMatch) return partialMatch
    
    // 3. Fuzzy match - första ordet + liknande belopp (±20%)
    const firstWordDesc = normalizedDesc.split(/[\s,.-]+/)[0]
    if (firstWordDesc.length >= 3) {
      const fuzzyMatch = existingSavings.find(sav => {
        const firstWordSav = sav.name.trim().toLowerCase().split(/[\s,.-]+/)[0]
        const amountMatch = Math.abs(sav.amount - absAmount) / Math.max(sav.amount, absAmount) < 0.2
        return (firstWordSav === firstWordDesc || 
                firstWordSav.startsWith(firstWordDesc) || 
                firstWordDesc.startsWith(firstWordSav)) && amountMatch
      })
      if (fuzzyMatch) return fuzzyMatch
    }
    
    return undefined
  }

  // Förhandsgranska mappning
  const handlePreview = () => {
    if (!mapping.dateColumn || !mapping.descriptionColumn || !mapping.amountColumn) {
      alert('Välj kolumner för datum, beskrivning och belopp')
      return
    }

    const parsed: ParsedTransaction[] = rawData.map((row) => {
      const errors: string[] = []
      
      const dateRaw = row[mapping.dateColumn]
      let date = parseDate(String(dateRaw || ''), mapping.dateFormat)
      
      // Om datumformat inte matchade, försök auto-detektera
      if (!date && dateRaw) {
        // Försök olika format automatiskt
        const formats = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'DD.MM.YYYY']
        for (const fmt of formats) {
          date = parseDate(String(dateRaw), fmt)
          if (date) break
        }
      }
      
      if (!date) errors.push(`Ogiltigt datum: ${dateRaw}`)
      
      const description = String(row[mapping.descriptionColumn] || '').trim()
      if (!description) errors.push('Saknar beskrivning')
      
      const amountRaw = row[mapping.amountColumn]
      // För kreditkort är beloppen oftast positiva men ska vara negativa utgifter
      const shouldInvert = mapping.sourceType === 'creditcard' || mapping.invertAmount
      const amount = parseAmount(amountRaw, shouldInvert)
      if (amount === null) errors.push(`Ogiltigt belopp: ${amountRaw}`)
      
      // Kontrollera om raden redan finns i NÅGON tabell
      const duplicateCheck = date && amount 
        ? checkDuplicateAnywhere(date, amount, description) 
        : { isDuplicate: false }
      
      // Auto-föreslå typ baserat på:
      // 1. Om det är en dubblett - föreslå samma typ som den hittades i
      // 2. Annars baserat på belopp (positiv = inkomst, negativ = rörlig utgift)
      let suggestedType: ImportTargetType
      if (duplicateCheck.isDuplicate && duplicateCheck.duplicateType) {
        // Mappa duplicateType till ImportTargetType
        const typeMap: Record<string, ImportTargetType> = {
          'transaction': 'variable',
          'income': 'income',
          'fixed': 'fixed',
          'savings': 'savings'
        }
        suggestedType = typeMap[duplicateCheck.duplicateType] || 'variable'
      } else {
        suggestedType = amount && amount > 0 ? 'income' : 'variable'
      }
      
      // Sök efter matchningar baserat på föreslagen typ
      let matchingIncome: Income | undefined
      let incomeAction: MatchAction | undefined
      let matchingSaving: Saving | undefined
      let savingAction: MatchAction | undefined
      let matchingFixedExpense: FixedExpense | undefined
      let fixedExpenseAction: MatchAction | undefined
      
      // Om det är en dubblett, sätt matchning och action baserat på duplicateCheck
      if (duplicateCheck.isDuplicate) {
        if (duplicateCheck.duplicateType === 'income') {
          matchingIncome = duplicateCheck.matchingRecord as Income
          incomeAction = 'skip'
        } else if (duplicateCheck.duplicateType === 'fixed') {
          matchingFixedExpense = duplicateCheck.matchingRecord as FixedExpense
          fixedExpenseAction = 'skip'
        } else if (duplicateCheck.duplicateType === 'savings') {
          matchingSaving = duplicateCheck.matchingRecord as Saving
          savingAction = 'skip'
        }
      } else if (suggestedType === 'income' && amount) {
        // Inte dubblett men kolla ändå för fuzzy match
        matchingIncome = findMatchingIncome(description, amount)
        incomeAction = matchingIncome ? 'skip' : 'create'
      }
      
      return {
        date: date || '',
        description,
        amount: amount || 0,
        rawRow: row,
        isValid: errors.length === 0,
        errors,
        isDuplicate: duplicateCheck.isDuplicate,
        duplicateType: duplicateCheck.duplicateType,
        targetType: suggestedType,
        matchingIncome,
        incomeAction,
        matchingSaving,
        savingAction,
        matchingFixedExpense,
        fixedExpenseAction,
      }
    })

    setParsedTransactions(parsed)
    // Förvälj alla giltiga transaktioner som INTE är dubbletter
    const validIndices = new Set(
      parsed
        .map((t, i) => (t.isValid && !t.isDuplicate) ? i : -1)
        .filter(i => i >= 0)
    )
    setSelectedForImport(validIndices)
    setImportStep('preview')
  }

  // Toggle en transaktion för import
  const toggleTransaction = (index: number) => {
    setSelectedForImport(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  // Ändra targetType för en transaktion
  const changeTargetType = (index: number, newType: ImportTargetType) => {
    setParsedTransactions(prev => {
      const updated = [...prev]
      const t = updated[index]
      
      // Rensa alla matchningar först
      let newT: ParsedTransaction = { 
        ...t, 
        targetType: newType,
        matchingFixedExpense: undefined,
        fixedExpenseAction: undefined,
        matchingIncome: undefined,
        incomeAction: undefined,
        matchingSaving: undefined,
        savingAction: undefined,
      }
      
      // Sök efter matchning beroende på typ
      if (newType === 'fixed') {
        const matching = findMatchingFixedExpense(t.description)
        newT.matchingFixedExpense = matching
        newT.fixedExpenseAction = matching ? 'update' : 'create'
      } else if (newType === 'income') {
        const matching = findMatchingIncome(t.description, t.amount)
        newT.matchingIncome = matching
        newT.incomeAction = matching ? 'skip' : 'create'  // Default: hoppa över om match finns (redan importerad)
      } else if (newType === 'savings') {
        const matching = findMatchingSaving(t.description, t.amount)
        newT.matchingSaving = matching
        newT.savingAction = matching ? 'skip' : 'create'  // Default: hoppa över om match finns
      }
      
      updated[index] = newT
      return updated
    })
    // Om man väljer 'skip', avmarkera för import
    if (newType === 'skip') {
      setSelectedForImport(prev => {
        const next = new Set(prev)
        next.delete(index)
        return next
      })
    }
  }

  // Ändra matchAction för en transaktion (för alla typer)
  const changeMatchAction = (index: number, action: MatchAction, type: 'fixed' | 'income' | 'savings') => {
    setParsedTransactions(prev => {
      const updated = [...prev]
      if (type === 'fixed') {
        updated[index] = { ...updated[index], fixedExpenseAction: action }
      } else if (type === 'income') {
        updated[index] = { ...updated[index], incomeAction: action }
      } else if (type === 'savings') {
        updated[index] = { ...updated[index], savingAction: action }
      }
      return updated
    })
    // Om man väljer 'skip', avmarkera för import
    if (action === 'skip') {
      setSelectedForImport(prev => {
        const next = new Set(prev)
        next.delete(index)
        return next
      })
    }
  }

  // Bulk-ändra targetType för alla valda
  const bulkChangeTargetType = (newType: ImportTargetType) => {
    setParsedTransactions(prev => {
      return prev.map((t, i) => {
        if (selectedForImport.has(i) && t.isValid && !t.isDuplicate) {
          // Rensa alla matchningar först
          let newT: ParsedTransaction = { 
            ...t, 
            targetType: newType,
            matchingFixedExpense: undefined,
            fixedExpenseAction: undefined,
            matchingIncome: undefined,
            incomeAction: undefined,
            matchingSaving: undefined,
            savingAction: undefined,
          }
          
          // Sök efter matchning beroende på typ
          if (newType === 'fixed') {
            const matching = findMatchingFixedExpense(t.description)
            newT.matchingFixedExpense = matching
            newT.fixedExpenseAction = matching ? 'update' : 'create'
          } else if (newType === 'income') {
            const matching = findMatchingIncome(t.description, t.amount)
            newT.matchingIncome = matching
            newT.incomeAction = matching ? 'skip' : 'create'
          } else if (newType === 'savings') {
            const matching = findMatchingSaving(t.description, t.amount)
            newT.matchingSaving = matching
            newT.savingAction = matching ? 'skip' : 'create'
          }
          
          return newT
        }
        return t
      })
    })
    // Om man väljer 'skip', avmarkera alla för import
    if (newType === 'skip') {
      setSelectedForImport(new Set())
    }
  }

  // Välj/avvälj alla
  const toggleAllTransactions = (selectAll: boolean) => {
    if (selectAll) {
      const validIndices = new Set(parsedTransactions.map((t, i) => t.isValid ? i : -1).filter(i => i >= 0))
      setSelectedForImport(validIndices)
    } else {
      setSelectedForImport(new Set())
    }
  }

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (transactions: ParsedTransaction[]) => {
      // Importera bara valda transaktioner som INTE är dubbletter och inte 'skip'
      const selectedTransactions = transactions.filter((t, i) => 
        t.isValid && 
        !t.isDuplicate && 
        t.targetType !== 'skip' &&
        selectedForImport.has(i)
      )
      
      // Hämta profilnamn om en profil är vald, annars använd mapping.name eller filnamn
      const profileName = selectedProfileId 
        ? savedProfiles.find(p => p.id === selectedProfileId)?.name 
        : mapping.name !== 'Ny profil' 
          ? mapping.name 
          : fileName.split('.')[0] // Ta bort filändelse
      
      // Räkna per typ
      const counts = { variable: 0, income: 0, fixed: 0, savings: 0 }
      
      for (const t of selectedTransactions) {
        const absAmount = Math.abs(t.amount)
        const notes = `Importerad från ${profileName}`
        
        switch (t.targetType) {
          case 'variable':
            // Rörlig utgift/inkomst → transactions-tabellen
            const newTransaction: NewTransaction = {
              date: t.date,
              description: t.description,
              amount: absAmount,
              type: t.amount < 0 ? 'expense' : 'income',
              category_id: null,
              notes,
            }
            await createTransaction(newTransaction)
            counts.variable++
            break
            
          case 'income':
            // Inkomst → incomes-tabellen
            // Kontrollera om vi ska uppdatera befintlig, skapa ny, eller hoppa över
            if (t.matchingIncome && t.incomeAction === 'update') {
              // Uppdatera befintlig inkomst med nytt belopp
              await updateIncome(t.matchingIncome.id, {
                amount: absAmount,
                notes: `${t.matchingIncome.notes || ''}\nUppdaterad ${t.date}: ${absAmount} kr`.trim(),
              })
              counts.income++
            } else if (t.incomeAction !== 'skip') {
              // Skapa ny inkomst (antingen ingen match, eller explicit 'create')
              const newIncome: NewIncome = {
                name: t.description,
                amount: absAmount,
                notes: `${notes} (${t.date})`,
                is_active: true,
              }
              await createIncome(newIncome)
              counts.income++
            }
            // Om incomeAction === 'skip', gör ingenting (redan importerad)
            break
            
          case 'fixed':
            // Fast utgift → fixed_expenses-tabellen
            // Kontrollera om vi ska uppdatera befintlig eller skapa ny
            if (t.matchingFixedExpense && t.fixedExpenseAction === 'update') {
              // Uppdatera befintlig fast utgift med nytt belopp
              await updateFixedExpense(t.matchingFixedExpense.id, {
                amount: absAmount,
                notes: `${t.matchingFixedExpense.notes || ''}\nUppdaterad ${t.date}: ${absAmount} kr`.trim(),
              })
              counts.fixed++
            } else if (t.fixedExpenseAction !== 'skip') {
              // Skapa ny fast utgift (antingen ingen match, eller explicit 'create')
              const newFixedExpense: NewFixedExpense = {
                name: t.description,
                amount: absAmount,
                budget: absAmount, // Default: budget = faktiskt belopp
                notes: `${notes} (${t.date})`,
                is_active: true,
              }
              await createFixedExpense(newFixedExpense)
              counts.fixed++
            }
            // Om fixedExpenseAction === 'skip', gör ingenting
            break
            
          case 'savings':
            // Sparande → savings-tabellen
            // Kontrollera om vi ska uppdatera befintligt, skapa nytt, eller hoppa över
            if (t.matchingSaving && t.savingAction === 'update') {
              // Uppdatera befintligt sparande med nytt belopp
              await updateSaving(t.matchingSaving.id, {
                amount: absAmount,
                notes: `${t.matchingSaving.notes || ''}\nUppdaterad ${t.date}: ${absAmount} kr`.trim(),
              })
              counts.savings++
            } else if (t.savingAction !== 'skip') {
              // Skapa nytt sparande (antingen ingen match, eller explicit 'create')
              const newSaving: NewSaving = {
                name: t.description,
                amount: absAmount,
                type: 'short', // Default till kortfristigt sparande
                notes: `${notes} (${t.date})`,
                is_active: true,
              }
              await createSaving(newSaving)
              counts.savings++
            }
            // Om savingAction === 'skip', gör ingenting (redan importerat)
            break
        }
      }
      
      return counts
    },
    onSuccess: (counts) => {
      // Invalidera alla relevanta queries
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['incomes'] })
      queryClient.invalidateQueries({ queryKey: ['fixed-expenses'] })
      queryClient.invalidateQueries({ queryKey: ['savings'] })
      
      // Skapa sammanfattning
      const parts = []
      if (counts.variable > 0) parts.push(`${counts.variable} rörliga utgifter`)
      if (counts.income > 0) parts.push(`${counts.income} inkomster`)
      if (counts.fixed > 0) parts.push(`${counts.fixed} fasta utgifter`)
      if (counts.savings > 0) parts.push(`${counts.savings} sparande`)
      
      const total = counts.variable + counts.income + counts.fixed + counts.savings
      alert(`${total} poster importerade!\n\n${parts.join('\n')}`)
      setImportStep('done')
    },
    onError: (error) => {
      console.error('Import error:', error)
      alert('Fel vid import. Se konsolen för detaljer.')
    },
  })

  const handleImport = () => {
    const selectedCount = selectedForImport.size
    if (selectedCount === 0) {
      alert('Inga transaktioner valda för import')
      return
    }
    
    if (confirm(`Importera ${selectedCount} transaktioner?`)) {
      importMutation.mutate(parsedTransactions)
    }
  }

  const handleReset = () => {
    setRawSheetData([])
    setRawData([])
    setColumns([])
    setFileName('')
    setParsedTransactions([])
    setImportStep('upload')
    setMapping(DEFAULT_MAPPING)
    setSelectedProfileId('')
    setEditingProfileId('')
    setNewProfileName('')
    setProfileNameError('')
    setSaveProfileAction('new')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">📥 Import</h1>
          <p className="text-slate-500 mt-1">
            Importera transaktioner från Excel-filer
          </p>
        </div>
        {importStep !== 'upload' && (
          <Button variant="outline" onClick={handleReset}>
            🔄 Börja om
          </Button>
        )}
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {['upload', 'map', 'preview', 'done'].map((step, index) => (
          <div key={step} className="flex items-center">
            <div className={`
              size-8 rounded-full flex items-center justify-center text-sm font-medium
              ${importStep === step 
                ? 'bg-teal-500 text-white' 
                : index < ['upload', 'map', 'preview', 'done'].indexOf(importStep)
                  ? 'bg-teal-100 text-teal-700'
                  : 'bg-slate-100 text-slate-400'
              }
            `}>
              {index + 1}
            </div>
            {index < 3 && (
              <div className={`w-8 h-0.5 ${
                index < ['upload', 'map', 'preview', 'done'].indexOf(importStep)
                  ? 'bg-teal-500' 
                  : 'bg-slate-200'
              }`} />
            )}
          </div>
        ))}
        <span className="ml-2 text-sm text-slate-500">
          {importStep === 'upload' && 'Ladda upp fil'}
          {importStep === 'map' && 'Mappa kolumner'}
          {importStep === 'preview' && 'Förhandsgranska'}
          {importStep === 'done' && 'Klart!'}
        </span>
      </div>

      {/* Steg 1: Filuppladdning */}
      {importStep === 'upload' && (
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-slate-800">Ladda upp Excel-fil</CardTitle>
            <CardDescription>
              Stöder .xlsx och .xls filer från banker och kreditkort
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center hover:border-teal-500 transition-colors">
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <Label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center">
                  📄
                </div>
                <span className="font-medium text-slate-700">Klicka för att välja fil</span>
                <span className="text-sm text-slate-500">eller dra och släpp här</span>
              </Label>
            </div>

            {savedProfiles.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-medium text-slate-700 mb-2">Dina sparade profiler:</h3>
                  <div className="flex flex-wrap gap-2">
                    {savedProfiles.map((profile) => (
                      <Badge 
                        key={profile.id} 
                        variant="outline"
                        className="py-1 px-3"
                      >
                        {profile.source_type === 'bank' ? '🏦' : '💳'} {profile.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Steg 2: Kolumnmappning */}
      {importStep === 'map' && (
        <>
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg text-slate-800">
                      Kolumnmappning - {fileName}
                    </CardTitle>
                    {editingProfileId && (
                      <Badge className="bg-blue-500">Redigerar profil</Badge>
                    )}
                  </div>
                  <CardDescription>
                    {rawData.length} rader hittades. Mappa kolumnerna till rätt fält.
                    {editingProfileId && (
                      <span className="block mt-1">
                        Du redigerar: <strong>{newProfileName}</strong>
                      </span>
                    )}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Välj sparad profil */}
              <div className="flex gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <Label>Ladda sparad profil</Label>
                  <Select value={selectedProfileId || "__none__"} onValueChange={(v) => handleLoadProfile(v === "__none__" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Välj bank/källa..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">-- Manuell mappning --</SelectItem>
                      {savedProfiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.source_type === 'bank' ? '🏦' : '💳'} {profile.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedProfileId && (
                  <>
                    <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                      <button
                        className="px-3 py-1.5 text-sm rounded border border-slate-300 hover:bg-red-50 text-slate-700 flex items-center gap-2"
                        onClick={() => setDeleteConfirmOpen(true)}
                      >
                        🗑️ Ta bort
                      </button>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Ta bort profil</DialogTitle>
                          <DialogDescription>
                            Är du säker på att du vill ta bort profilen "{savedProfiles.find(p => p.id === selectedProfileId)?.name}"? 
                            Den kan inte återställas.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                            Avbryt
                          </Button>
                          <Button 
                            variant="destructive"
                            onClick={() => {
                              deleteProfileMutation.mutate(selectedProfileId)
                              setDeleteConfirmOpen(false)
                            }}
                            disabled={deleteProfileMutation.isPending}
                          >
                            {deleteProfileMutation.isPending ? 'Tar bort...' : 'Ta bort profil'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </div>

              <Separator />

              {/* Mappning */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Datum-kolumn *</Label>
                  <Select 
                    value={mapping.dateColumn || undefined} 
                    onValueChange={(v) => setMapping({...mapping, dateColumn: v || ''})}
                  >
                  <SelectTrigger>
                    <SelectValue placeholder="Välj kolumn..." />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.filter(col => col && !col.startsWith('__EMPTY')).map((col) => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

                <div className="space-y-2">
                  <Label>Beskrivning-kolumn *</Label>
                  <Select 
                    value={mapping.descriptionColumn || undefined} 
                    onValueChange={(v) => setMapping({...mapping, descriptionColumn: v || ''})}
                  >
                  <SelectTrigger>
                    <SelectValue placeholder="Välj kolumn..." />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.filter(col => col && !col.startsWith('__EMPTY')).map((col) => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

                <div className="space-y-2">
                  <Label>Belopp-kolumn *</Label>
                  <Select 
                    value={mapping.amountColumn || undefined} 
                    onValueChange={(v) => setMapping({...mapping, amountColumn: v || ''})}
                  >
                  <SelectTrigger>
                    <SelectValue placeholder="Välj kolumn..." />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.filter(col => col && !col.startsWith('__EMPTY')).map((col) => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Typ av källa</Label>
                  <Select 
                    value={mapping.sourceType} 
                    onValueChange={(v) => setMapping({...mapping, sourceType: v as 'bank' | 'creditcard'})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank">🏦 Bank</SelectItem>
                      <SelectItem value="creditcard">💳 Kreditkort</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Datumformat</Label>
                  <Select 
                    value={mapping.dateFormat} 
                    onValueChange={(v) => setMapping({...mapping, dateFormat: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="YYYY-MM-DD">2024-01-15</SelectItem>
                      <SelectItem value="DD/MM/YYYY">15/01/2024</SelectItem>
                      <SelectItem value="DD.MM.YYYY">15.01.2024</SelectItem>
                      <SelectItem value="MM/DD/YYYY">01/15/2024 (US format)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Header-rad (0 = första)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={mapping.headerRow}
                    onChange={(e) => {
                      const newHeaderRow = parseInt(e.target.value) || 0
                      setMapping({...mapping, headerRow: newHeaderRow})
                      if (rawSheetData.length > 0) {
                        processDataWithHeaderRow(rawSheetData, newHeaderRow)
                      }
                    }}
                  />
                </div>

                <div className="flex items-center gap-2 pt-8">
                  <input
                    type="checkbox"
                    id="invertAmount"
                    checked={mapping.invertAmount}
                    onChange={(e) => setMapping({...mapping, invertAmount: e.target.checked})}
                    className="size-4"
                  />
                  <Label htmlFor="invertAmount" className="font-normal">
                    Invertera belopp
                  </Label>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline"
                      disabled={!mapping.dateColumn || !mapping.descriptionColumn || !mapping.amountColumn}
                    >
                      💾 Spara profil
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingProfileId ? 'Uppdatera eller spara som ny profil' : 'Spara importprofil'}
                      </DialogTitle>
                      <DialogDescription>
                        {editingProfileId 
                          ? 'Välj om du vill uppdatera den befintliga profilen eller skapa en ny'
                          : 'Spara denna mappning för att återanvända vid framtida importer'
                        }
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      {/* Om vi redigerar en befintlig profil, visa val mellan uppdatera eller ny */}
                      {editingProfileId && (
                        <div className="space-y-3 pb-3 border-b">
                          <Label className="text-base font-semibold">Vad vill du göra?</Label>
                          <div className="space-y-2">
                            <label className="flex items-center gap-3 p-2 border rounded cursor-pointer hover:bg-slate-50" 
                              onClick={() => setSaveProfileAction('update')}>
                              <input 
                                type="radio" 
                                name="action" 
                                checked={saveProfileAction === 'update'}
                                onChange={() => setSaveProfileAction('update')}
                              />
                              <span>Uppdatera befintlig profil</span>
                            </label>
                            <label className="flex items-center gap-3 p-2 border rounded cursor-pointer hover:bg-slate-50"
                              onClick={() => setSaveProfileAction('new')}>
                              <input 
                                type="radio" 
                                name="action" 
                                checked={saveProfileAction === 'new'}
                                onChange={() => setSaveProfileAction('new')}
                              />
                              <span>Spara som ny profil</span>
                            </label>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="profile-name">
                          {saveProfileAction === 'update' ? 'Profilnamn (oförändrat)' : 'Profilnamn'}
                        </Label>
                        <Input
                          id="profile-name"
                          placeholder="T.ex. Nordea Privatkonto"
                          value={newProfileName}
                          onChange={(e) => {
                            setNewProfileName(e.target.value)
                            setProfileNameError('')
                          }}
                          disabled={!!(editingProfileId && saveProfileAction === 'update')}
                        />
                        {profileNameError && (
                          <p className="text-sm text-red-600">{profileNameError}</p>
                        )}
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => {
                          setSaveDialogOpen(false)
                          setProfileNameError('')
                        }}>
                          Avbryt
                        </Button>
                        <Button 
                          onClick={handleSaveProfile}
                          className="bg-teal-500 hover:bg-teal-600"
                          disabled={saveProfileMutation.isPending}
                        >
                          {saveProfileMutation.isPending ? 'Sparar...' : 'Spara'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleReset}>
                    Avbryt
                  </Button>
                  <Button 
                    onClick={handlePreview}
                    className="bg-teal-500 hover:bg-teal-600"
                  >
                    Förhandsgranska →
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rå data förhandsgranskning */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-slate-800">Rå data (första 5 rader)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {columns.map((col) => (
                        <TableHead key={col} className="whitespace-nowrap">
                          {col}
                          {col === mapping.dateColumn && <Badge className="ml-1 bg-blue-500">Datum</Badge>}
                          {col === mapping.descriptionColumn && <Badge className="ml-1 bg-green-500">Beskr.</Badge>}
                          {col === mapping.amountColumn && <Badge className="ml-1 bg-orange-500">Belopp</Badge>}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rawData.slice(0, 5).map((row, idx) => (
                      <TableRow key={idx}>
                        {columns.map((col) => (
                          <TableCell key={col} className="whitespace-nowrap text-sm">
                            {String(row[col] || '')}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Steg 3: Förhandsgranska */}
      {importStep === 'preview' && (
        <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-slate-800">Förhandsgranska import</CardTitle>
              <CardDescription>
                {selectedForImport.size} av {parsedTransactions.filter(t => t.isValid && !t.isDuplicate).length} nya transaktioner valda
                {parsedTransactions.filter(t => t.isDuplicate).length > 0 && (
                  <span className="ml-2 text-orange-600">
                    ({parsedTransactions.filter(t => t.isDuplicate).length} dubbletter hoppas över)
                  </span>
                )}
              </CardDescription>
            </CardHeader>
          <CardContent className="space-y-4">
            {/* Summering - visar bara valda */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-teal-50 border-teal-200">
                <CardContent className="pt-4">
                  <p className="text-sm text-teal-700">Inkomster (valda)</p>
                  <p className="text-2xl font-bold text-teal-600">
                    {formatCurrency(
                      parsedTransactions
                        .filter((t, i) => selectedForImport.has(i) && t.amount > 0)
                        .reduce((sum, t) => sum + t.amount, 0)
                    )}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-red-50 border-red-200">
                <CardContent className="pt-4">
                  <p className="text-sm text-red-700">Utgifter (valda)</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(
                      parsedTransactions
                        .filter((t, i) => selectedForImport.has(i) && t.amount < 0)
                        .reduce((sum, t) => sum + Math.abs(t.amount), 0)
                    )}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-slate-50 border-slate-200">
                <CardContent className="pt-4">
                  <p className="text-sm text-slate-600">Valda för import</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {selectedForImport.size} st
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Välj alla / Avmarkera alla + Bulk typ-ändring */}
            <div className="flex flex-wrap items-center gap-4 py-2 border-b border-slate-200">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => toggleAllTransactions(true)}
              >
                ✅ Välj alla
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => toggleAllTransactions(false)}
              >
                ⬜ Avmarkera alla
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <span className="text-sm text-slate-600 font-medium">Ändra valda till:</span>
              {(['variable', 'income', 'fixed', 'savings'] as ImportTargetType[]).map(type => (
                <Button
                  key={type}
                  variant="outline"
                  size="sm"
                  onClick={() => bulkChangeTargetType(type)}
                  disabled={selectedForImport.size === 0}
                  className={`text-xs ${TARGET_TYPE_LABELS[type].color}`}
                >
                  {TARGET_TYPE_LABELS[type].emoji} {TARGET_TYPE_LABELS[type].label}
                </Button>
              ))}
            </div>

            {/* Transaktionslista */}
            <div className="overflow-x-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Välj</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Beskrivning</TableHead>
                    <TableHead className="text-right">Belopp</TableHead>
                    <TableHead className="w-40">Importera som</TableHead>
                    <TableHead className="w-56">Matchning</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedTransactions.map((t, idx) => {
                    // Skapa unik key med index + datum + belopp för att undvika duplicates
                    const uniqueKey = `${idx}-${t.date}-${t.amount}-${t.description?.substring(0, 20)}`
                    const isDisabled = !t.isValid || t.isDuplicate
                    return (
                    <TableRow 
                      key={uniqueKey} 
                      className={`transition-colors ${
                        !t.isValid 
                          ? 'bg-red-50 opacity-50' 
                          : t.isDuplicate
                            ? 'bg-orange-50 opacity-75'
                            : selectedForImport.has(idx)
                              ? 'bg-white hover:bg-slate-50 cursor-pointer'
                              : 'bg-slate-100 opacity-60 cursor-pointer'
                      }`}
                      onClick={() => !isDisabled && toggleTransaction(idx)}
                    >
                      <TableCell>
                        {t.isValid ? (
                          t.isDuplicate ? (
                            <Badge 
                              variant="outline" 
                              className="bg-orange-100 border-orange-300 text-orange-700" 
                              title={`Finns redan som ${
                                t.duplicateType === 'transaction' ? 'rörlig utgift' :
                                t.duplicateType === 'income' ? 'inkomst' :
                                t.duplicateType === 'fixed' ? 'fast utgift' :
                                t.duplicateType === 'savings' ? 'sparande' : 'okänd'
                              }`}
                            >
                              🔄 Finns redan
                            </Badge>
                          ) : (
                            <input
                              type="checkbox"
                              checked={selectedForImport.has(idx)}
                              onChange={() => toggleTransaction(idx)}
                              onClick={(e) => e.stopPropagation()}
                              className="size-4 rounded border-slate-300"
                            />
                          )
                        ) : (
                          <Badge variant="destructive" title={t.errors.join(', ')}>
                            ✗
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{t.date || '-'}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {t.description}
                        {!selectedForImport.has(idx) && t.isValid && !t.isDuplicate && (
                          <Badge variant="outline" className="ml-2 text-xs">Hoppas över</Badge>
                        )}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${
                        t.amount < 0 ? 'text-red-600' : 'text-teal-600'
                      }`}>
                        {formatCurrency(t.amount)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {t.isValid && !t.isDuplicate ? (
                          <Select
                            value={t.targetType}
                            onValueChange={(v) => changeTargetType(idx, v as ImportTargetType)}
                          >
                            <SelectTrigger className={`h-8 text-xs ${TARGET_TYPE_LABELS[t.targetType].color}`}>
                              <SelectValue>
                                {TARGET_TYPE_LABELS[t.targetType].emoji} {TARGET_TYPE_LABELS[t.targetType].label}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {(['variable', 'income', 'fixed', 'savings', 'skip'] as ImportTargetType[]).map(type => (
                                <SelectItem key={type} value={type}>
                                  {TARGET_TYPE_LABELS[type].emoji} {TARGET_TYPE_LABELS[type].label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {t.isValid && !t.isDuplicate && t.targetType === 'fixed' ? (
                          t.matchingFixedExpense ? (
                            <div className="space-y-1">
                              <div className="text-xs text-blue-600 font-medium">
                                ✓ Matchar: {t.matchingFixedExpense.name}
                              </div>
                              <div className="text-xs text-slate-500">
                                ({formatCurrency(t.matchingFixedExpense.amount)})
                              </div>
                              <Select
                                value={t.fixedExpenseAction || 'update'}
                                onValueChange={(v) => changeMatchAction(idx, v as MatchAction, 'fixed')}
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="update">📝 Uppdatera belopp</SelectItem>
                                  <SelectItem value="create">➕ Skapa ny ändå</SelectItem>
                                  <SelectItem value="skip">⏭️ Hoppa över</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Ingen match - skapar ny</span>
                          )
                        ) : t.isValid && !t.isDuplicate && t.targetType === 'income' ? (
                          t.matchingIncome ? (
                            <div className="space-y-1">
                              <div className="text-xs text-green-600 font-medium">
                                ✓ Matchar: {t.matchingIncome.name}
                              </div>
                              <div className="text-xs text-slate-500">
                                ({formatCurrency(t.matchingIncome.amount)})
                              </div>
                              <Select
                                value={t.incomeAction || 'skip'}
                                onValueChange={(v) => changeMatchAction(idx, v as MatchAction, 'income')}
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="skip">⏭️ Finns redan</SelectItem>
                                  <SelectItem value="update">📝 Uppdatera belopp</SelectItem>
                                  <SelectItem value="create">➕ Skapa ny ändå</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Ingen match - skapar ny</span>
                          )
                        ) : t.isValid && !t.isDuplicate && t.targetType === 'savings' ? (
                          t.matchingSaving ? (
                            <div className="space-y-1">
                              <div className="text-xs text-purple-600 font-medium">
                                ✓ Matchar: {t.matchingSaving.name}
                              </div>
                              <div className="text-xs text-slate-500">
                                ({formatCurrency(t.matchingSaving.amount)})
                              </div>
                              <Select
                                value={t.savingAction || 'skip'}
                                onValueChange={(v) => changeMatchAction(idx, v as MatchAction, 'savings')}
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="skip">⏭️ Finns redan</SelectItem>
                                  <SelectItem value="update">📝 Uppdatera belopp</SelectItem>
                                  <SelectItem value="create">➕ Skapa ny ändå</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Ingen match - skapar ny</span>
                          )
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setImportStep('map')}>
                ← Tillbaka
              </Button>
              <Button 
                onClick={handleImport}
                className="bg-teal-500 hover:bg-teal-600"
                disabled={importMutation.isPending || selectedForImport.size === 0}
              >
                {importMutation.isPending 
                  ? 'Importerar...' 
                  : `Importera ${selectedForImport.size} nya transaktioner`
                }
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Steg 4: Klart */}
      {importStep === 'done' && (
        <Card className="bg-teal-50 border-teal-200">
          <CardContent className="py-12 text-center">
            <div className="size-16 rounded-full bg-teal-500 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl text-white">✓</span>
            </div>
            <h2 className="text-2xl font-bold text-teal-700 mb-2">Import klar!</h2>
            <p className="text-teal-600 mb-6">
              Dina transaktioner har importerats och finns nu i systemet.
            </p>
            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={handleReset}>
                Importera fler
              </Button>
              <Button className="bg-teal-500 hover:bg-teal-600" asChild>
                <a href="/app/variable-expenses">Visa transaktioner →</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug-info för utveckling */}
      {import.meta.env.DEV && rawData.length > 0 && (
        <Card className="bg-slate-800 text-slate-100">
          <CardHeader>
            <CardTitle className="text-sm font-mono">🔧 Debug (endast dev)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs overflow-auto max-h-48">
              {JSON.stringify({ mapping, columns, rowCount: rawData.length }, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
