// =====================================================
// BUDGET APP - Database Types
// =====================================================

export type TransactionType = 'income' | 'expense'
export type SavingsType = 'short' | 'long' | 'risk'
export type PaymentMethod = 'kort' | 'swish' | 'kontant' | 'autogiro' | 'faktura'

// =====================================================
// CATEGORIES (för rörliga utgifter)
// =====================================================
export type Category = {
  id: string
  user_id: string
  name: string
  type: TransactionType
  icon: string | null
  created_at: string
}

// =====================================================
// TRANSACTIONS (rörliga utgifter/inkomster)
// =====================================================
export type Transaction = {
  id: string
  user_id: string
  category_id: string | null
  amount: number
  type: TransactionType
  description: string | null
  date: string
  notes: string | null
  tags: string[] | null
  payment_method: PaymentMethod | null
  receipt_url: string | null
  created_at: string
  updated_at: string | null
  // Joined data
  category?: Category
}

export type NewTransaction = {
  category_id: string | null
  amount: number
  type: TransactionType
  description: string | null
  date: string
  notes?: string | null
  tags?: string[] | null
  payment_method?: PaymentMethod | null
}

// =====================================================
// INCOMES (återkommande månadsinkomster)
// =====================================================
export type Income = {
  id: string
  user_id: string
  name: string
  amount: number
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string | null
}

export type NewIncome = {
  name: string
  amount: number
  notes?: string | null
  is_active?: boolean
}

// =====================================================
// FIXED EXPENSES (fasta månatliga utgifter)
// =====================================================
export type FixedExpense = {
  id: string
  user_id: string
  name: string
  amount: number
  budget: number
  due_day: number | null
  category: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string | null
}

export type NewFixedExpense = {
  name: string
  amount?: number
  budget: number
  due_day?: number | null
  category?: string | null
  notes?: string | null
  is_active?: boolean
}

// =====================================================
// SAVINGS (sparande)
// =====================================================
export type Saving = {
  id: string
  user_id: string
  name: string
  amount: number
  type: SavingsType
  affects_investment_ratio: boolean
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string | null
}

export type NewSaving = {
  name: string
  amount: number
  type: SavingsType
  affects_investment_ratio?: boolean
  notes?: string | null
  is_active?: boolean
}

// =====================================================
// MONTHLY SUMMARIES (cachade sammanfattningar)
// =====================================================
export type MonthlySummary = {
  id: string
  user_id: string
  year: number
  month: number
  total_income: number
  total_fixed_expenses: number
  total_variable_expenses: number
  total_savings: number
  savings_ratio: number
  notes: string | null
  created_at: string
  updated_at: string | null
}

// =====================================================
// CATEGORY BUDGETS (budgetmål per kategori)
// =====================================================
export type CategoryBudget = {
  id: string
  user_id: string
  category: string
  monthly_budget: number
  is_active: boolean
  created_at: string
  updated_at: string | null
}

export type NewCategoryBudget = {
  category: string
  monthly_budget: number
  is_active?: boolean
}

// =====================================================
// IMPORT PROFILES (sparade kolumnmappningar)
// =====================================================
export type ImportProfile = {
  id: string
  user_id: string
  name: string
  source_type: 'bank' | 'creditcard'
  date_column: string
  description_column: string
  amount_column: string
  date_format: string
  invert_amount: boolean
  skip_rows: number
  is_default: boolean
  created_at: string
}

export type NewImportProfile = {
  name: string
  source_type: 'bank' | 'creditcard'
  date_column: string
  description_column: string
  amount_column: string
  date_format?: string
  invert_amount?: boolean
  skip_rows?: number
  is_default?: boolean
}

// =====================================================
// DASHBOARD SUMMARY (beräknad data)
// =====================================================
export type DashboardSummary = {
  // Inkomster
  totalIncome: number
  incomes: Income[]
  
  // Fasta utgifter
  totalFixedExpenses: number
  totalFixedBudget: number
  fixedExpenses: FixedExpense[]
  
  // Rörliga utgifter
  totalVariableExpenses: number
  variableExpenses: Transaction[]
  
  // Sparande
  totalSavings: number
  savings: Saving[]
  
  // KPIs
  balance: number
  savingsRatio: number           // Sparkvot (%)
  fixedExpenseRatio: number      // Fasta utgifter som % av inkomst
  variableExpenseRatio: number   // Rörliga utgifter som % av inkomst
}
