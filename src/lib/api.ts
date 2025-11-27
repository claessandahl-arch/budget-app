import { supabase } from './supabase'
import type { 
  Category, 
  Transaction, 
  NewTransaction,
  Income,
  NewIncome,
  FixedExpense,
  NewFixedExpense,
  Saving,
  NewSaving,
  DashboardSummary,
  ImportProfile,
  NewImportProfile
} from '@/types/database'

// =====================================================
// CATEGORIES
// =====================================================
export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  if (error) throw error
  return data
}

// =====================================================
// TRANSACTIONS (Rörliga utgifter)
// =====================================================
export async function getTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      category:categories(*)
    `)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getTransactionsForMonth(year: number, month: number): Promise<Transaction[]> {
  const startDate = new Date(year, month, 1).toISOString().split('T')[0]
  const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      category:categories(*)
    `)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function createTransaction(transaction: NewTransaction): Promise<Transaction> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Inte inloggad')

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      ...transaction,
      user_id: user.id
    })
    .select(`
      *,
      category:categories(*)
    `)
    .single()

  if (error) throw error
  return data
}

export async function updateTransaction(id: string, transaction: Partial<NewTransaction>): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .update(transaction)
    .eq('id', id)
    .select(`
      *,
      category:categories(*)
    `)
    .single()

  if (error) throw error
  return data
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// =====================================================
// INCOMES (Inkomster)
// =====================================================
export async function getIncomes(): Promise<Income[]> {
  const { data, error } = await supabase
    .from('incomes')
    .select('*')
    .order('name')

  if (error) throw error
  return data
}

export async function getActiveIncomes(): Promise<Income[]> {
  const { data, error } = await supabase
    .from('incomes')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (error) throw error
  return data
}

export async function createIncome(income: NewIncome): Promise<Income> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Inte inloggad')

  const { data, error } = await supabase
    .from('incomes')
    .insert({
      ...income,
      user_id: user.id
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateIncome(id: string, income: Partial<NewIncome>): Promise<Income> {
  const { data, error } = await supabase
    .from('incomes')
    .update(income)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteIncome(id: string): Promise<void> {
  const { error } = await supabase
    .from('incomes')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// =====================================================
// FIXED EXPENSES (Fasta utgifter)
// =====================================================
export async function getFixedExpenses(): Promise<FixedExpense[]> {
  const { data, error } = await supabase
    .from('fixed_expenses')
    .select('*')
    .order('name')

  if (error) throw error
  return data
}

export async function getActiveFixedExpenses(): Promise<FixedExpense[]> {
  const { data, error } = await supabase
    .from('fixed_expenses')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (error) throw error
  return data
}

export async function createFixedExpense(expense: NewFixedExpense): Promise<FixedExpense> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Inte inloggad')

  const { data, error } = await supabase
    .from('fixed_expenses')
    .insert({
      ...expense,
      user_id: user.id
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateFixedExpense(id: string, expense: Partial<NewFixedExpense>): Promise<FixedExpense> {
  const { data, error } = await supabase
    .from('fixed_expenses')
    .update(expense)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteFixedExpense(id: string): Promise<void> {
  const { error } = await supabase
    .from('fixed_expenses')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// =====================================================
// SAVINGS (Sparande)
// =====================================================
export async function getSavings(): Promise<Saving[]> {
  const { data, error } = await supabase
    .from('savings')
    .select('*')
    .order('name')

  if (error) throw error
  return data
}

export async function getActiveSavings(): Promise<Saving[]> {
  const { data, error } = await supabase
    .from('savings')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (error) throw error
  return data
}

export async function createSaving(saving: NewSaving): Promise<Saving> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Inte inloggad')

  const { data, error } = await supabase
    .from('savings')
    .insert({
      ...saving,
      user_id: user.id
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateSaving(id: string, saving: Partial<NewSaving>): Promise<Saving> {
  const { data, error } = await supabase
    .from('savings')
    .update(saving)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteSaving(id: string): Promise<void> {
  const { error } = await supabase
    .from('savings')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// =====================================================
// DASHBOARD SUMMARY (Beräknad sammanfattning)
// =====================================================
export async function getDashboardSummary(year: number, month: number): Promise<DashboardSummary> {
  // Hämta all data parallellt
  const [incomes, fixedExpenses, variableExpenses, savings] = await Promise.all([
    getActiveIncomes(),
    getActiveFixedExpenses(),
    getTransactionsForMonth(year, month),
    getActiveSavings()
  ])

  // Beräkna totaler
  const totalIncome = incomes.reduce((sum, i) => sum + Number(i.amount), 0)
  const totalFixedExpenses = fixedExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const totalFixedBudget = fixedExpenses.reduce((sum, e) => sum + Number(e.budget), 0)
  const totalVariableExpenses = variableExpenses
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)
  const totalSavings = savings.reduce((sum, s) => sum + Number(s.amount), 0)

  // Beräkna KPIs
  const balance = totalIncome - totalFixedExpenses - totalVariableExpenses - totalSavings
  const savingsRatio = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0
  const fixedExpenseRatio = totalIncome > 0 ? (totalFixedExpenses / totalIncome) * 100 : 0
  const variableExpenseRatio = totalIncome > 0 ? (totalVariableExpenses / totalIncome) * 100 : 0

  return {
    totalIncome,
    incomes,
    totalFixedExpenses,
    totalFixedBudget,
    fixedExpenses,
    totalVariableExpenses,
    variableExpenses,
    totalSavings,
    savings,
    balance,
    savingsRatio,
    fixedExpenseRatio,
    variableExpenseRatio
  }
}

// =====================================================
// STATISTICS (Snittberäkningar över tid)
// =====================================================
export async function getAverageExpensesByCategory(months: number = 12): Promise<Record<string, number>> {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months)

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      amount,
      category:categories(name)
    `)
    .eq('type', 'expense')
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0])

  if (error) throw error
  if (!data) return {}

  // Gruppera per kategori
  const categoryTotals: Record<string, number> = {}
  for (const t of data) {
    // Supabase returns joined data as array or object depending on relationship
    const catData = t.category as unknown
    const categoryName = Array.isArray(catData) 
      ? (catData[0] as { name: string } | undefined)?.name 
      : (catData as { name: string } | null)?.name
    categoryTotals[categoryName || 'Okategoriserat'] = (categoryTotals[categoryName || 'Okategoriserat'] || 0) + Number(t.amount)
  }

  // Beräkna snitt per månad
  const averages: Record<string, number> = {}
  for (const [category, total] of Object.entries(categoryTotals)) {
    averages[category] = total / months
  }

  return averages
}

export async function getMonthlyTotals(months: number = 12): Promise<{
  month: string
  income: number
  fixedExpenses: number
  variableExpenses: number
  savings: number
}[]> {
  const results = []
  const now = new Date()

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = date.getFullYear()
    const month = date.getMonth()

    const summary = await getDashboardSummary(year, month)
    
    results.push({
      month: date.toLocaleDateString('sv-SE', { year: 'numeric', month: 'short' }),
      income: summary.totalIncome,
      fixedExpenses: summary.totalFixedExpenses,
      variableExpenses: summary.totalVariableExpenses,
      savings: summary.totalSavings
    })
  }

  return results
}

// Legacy support - behåll för bakåtkompatibilitet
export async function getMonthlySummary(year: number, month: number) {
  const transactions = await getTransactionsForMonth(year, month)
  
  const income = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0)
  
  const expenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  return {
    income,
    expenses,
    balance: income - expenses,
    transactions
  }
}

// =====================================================
// IMPORT PROFILES (Importprofiler)
// =====================================================
export async function getImportProfiles(): Promise<ImportProfile[]> {
  const { data, error } = await supabase
    .from('import_profiles')
    .select('*')
    .order('name')

  if (error) throw error
  return data
}

export async function createImportProfile(profile: NewImportProfile): Promise<ImportProfile> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Inte inloggad')

  const { data, error } = await supabase
    .from('import_profiles')
    .insert({
      ...profile,
      user_id: user.id
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateImportProfile(id: string, profile: Partial<NewImportProfile>): Promise<ImportProfile> {
  const { data, error } = await supabase
    .from('import_profiles')
    .update(profile)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteImportProfile(id: string): Promise<void> {
  const { error } = await supabase
    .from('import_profiles')
    .delete()
    .eq('id', id)

  if (error) throw error
}
