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
import { createTransaction, getImportProfiles, createImportProfile, deleteImportProfile, getTransactions } from '@/lib/api'
import type { NewTransaction, NewImportProfile } from '@/types/database'

// Typ för rå Excel-data
type RawRow = Record<string, unknown>

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

type ParsedTransaction = {
  date: string
  description: string
  amount: number
  rawRow: RawRow
  isValid: boolean
  errors: string[]
  isDuplicate?: boolean  // Om transaktionen redan finns i databasen
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

  // Spara profil mutation
  const saveProfileMutation = useMutation({
    mutationFn: (profile: NewImportProfile) => createImportProfile(profile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-profiles'] })
      setSaveDialogOpen(false)
      setNewProfileName('')
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
        // Omprocessa data med ny header-rad
        if (rawSheetData.length > 0) {
          processDataWithHeaderRow(rawSheetData, profile.skip_rows)
        }
      }
    }
  }

  // Spara aktuell mappning som profil
  const handleSaveProfile = () => {
    if (!newProfileName.trim()) {
      alert('Ange ett namn för profilen')
      return
    }

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

    saveProfileMutation.mutate(profile)
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

  // Kontrollera om en transaktion redan finns
  const checkDuplicate = (date: string, amount: number, description: string): boolean => {
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
      
      // Kontrollera om transaktionen redan finns
      const isDuplicate = date && amount ? checkDuplicate(date, amount, description) : false
      
      return {
        date: date || '',
        description,
        amount: amount || 0,
        rawRow: row,
        isValid: errors.length === 0,
        errors,
        isDuplicate,
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
      // Importera bara valda transaktioner som INTE är dubbletter
      const selectedTransactions = transactions.filter((t, i) => 
        t.isValid && 
        !t.isDuplicate && 
        selectedForImport.has(i)
      )
      
      // Hämta profilnamn om en profil är vald, annars använd mapping.name eller filnamn
      const profileName = selectedProfileId 
        ? savedProfiles.find(p => p.id === selectedProfileId)?.name 
        : mapping.name !== 'Ny profil' 
          ? mapping.name 
          : fileName.split('.')[0] // Ta bort filändelse
      
      for (const t of selectedTransactions) {
        const newTransaction: NewTransaction = {
          date: t.date,
          description: t.description,
          amount: Math.abs(t.amount),
          type: t.amount < 0 ? 'expense' : 'income',
          category_id: null,
          notes: `Importerad från ${profileName}`,
        }
        await createTransaction(newTransaction)
      }
      
      return selectedTransactions.length
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      alert(`${count} transaktioner importerade!`)
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
              <CardTitle className="text-lg text-slate-800">
                Kolumnmappning - {fileName}
              </CardTitle>
              <CardDescription>
                {rawData.length} rader hittades. Mappa kolumnerna till rätt fält.
              </CardDescription>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm('Ta bort denna profil?')) {
                        deleteProfileMutation.mutate(selectedProfileId)
                      }
                    }}
                  >
                    🗑️ Ta bort
                  </Button>
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
                      <DialogTitle>Spara importprofil</DialogTitle>
                      <DialogDescription>
                        Spara denna mappning för att återanvända vid framtida importer
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="profile-name">Profilnamn</Label>
                        <Input
                          id="profile-name"
                          placeholder="T.ex. Nordea Privatkonto"
                          value={newProfileName}
                          onChange={(e) => setNewProfileName(e.target.value)}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
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

            {/* Välj alla / Avmarkera alla */}
            <div className="flex items-center gap-4 py-2 border-b border-slate-200">
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
              <span className="text-sm text-slate-500">
                💡 Avmarkera överföringar (t.ex. AMERICAN EXPRESS) för att undvika dubbelräkning
              </span>
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
                            <Badge variant="outline" className="bg-orange-100 border-orange-300 text-orange-700" title="Denna transaktion finns redan i databasen">
                              🔄 Dubblett
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
