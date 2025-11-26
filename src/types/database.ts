export type TransactionType = 'income' | 'expense'

export type Category = {
  id: string
  user_id: string
  name: string
  type: TransactionType
  icon: string | null
  created_at: string
}

export type Transaction = {
  id: string
  user_id: string
  category_id: string | null
  amount: number
  type: TransactionType
  description: string | null
  date: string
  created_at: string
  // Joined data
  category?: Category
}

export type NewTransaction = {
  category_id: string | null
  amount: number
  type: TransactionType
  description: string | null
  date: string
}

