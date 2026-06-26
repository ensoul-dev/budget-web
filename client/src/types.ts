export interface Account {
  id: number
  name: string
  emoji: string
  color_hex: string
  balance: number
}

export interface Category {
  id: number
  name: string
  emoji: string
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER'
}

export interface Transaction {
  id: number
  date: string
  amount: number
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER'
  category_id: number | null
  account_id: number | null
  to_account_id: number | null
  note: string
  category_name?: string
  category_emoji?: string
  account_name?: string
  account_emoji?: string
  to_account_name?: string
}

export interface MonthStats {
  income: number
  expense: number
  byCategory: Array<{ id: number; name: string; emoji: string; total: number; type: string }>
}
