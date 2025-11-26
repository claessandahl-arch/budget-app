import { supabase } from './supabase'
import type { Category, Transaction, NewTransaction } from '@/types/database'

// Categories
export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  if (error) throw error
  return data
}

// Transactions
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

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Summary
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

