import type { Account, Category, Transaction, MonthStats } from './types'

const BASE = '/api'

export async function getAccounts(): Promise<Account[]> {
  const r = await fetch(`${BASE}/accounts`)
  return r.json()
}

export async function getCategories(): Promise<Category[]> {
  const r = await fetch(`${BASE}/categories`)
  return r.json()
}

export async function getTransactions(params: {
  limit?: number
  offset?: number
  month?: string
  account_id?: number
  category_id?: number
  type?: string
} = {}): Promise<{ rows: Transaction[]; total: number }> {
  const q = new URLSearchParams()
  if (params.limit) q.set('limit', String(params.limit))
  if (params.offset) q.set('offset', String(params.offset))
  if (params.month) q.set('month', params.month)
  if (params.account_id) q.set('account_id', String(params.account_id))
  if (params.category_id) q.set('category_id', String(params.category_id))
  if (params.type) q.set('type', params.type)
  const r = await fetch(`${BASE}/transactions?${q}`)
  return r.json()
}

export async function addTransaction(data: {
  date: string
  amount: number
  type: string
  category_id?: number | null
  account_id?: number | null
  to_account_id?: number | null
  note?: string
}): Promise<{ id: number }> {
  const r = await fetch(`${BASE}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return r.json()
}

export async function deleteTransaction(id: number): Promise<void> {
  await fetch(`${BASE}/transactions/${id}`, { method: 'DELETE' })
}

export async function getTransaction(id: number): Promise<Transaction> {
  const r = await fetch(`${BASE}/transactions/${id}`)
  return r.json()
}

export async function updateTransaction(id: number, data: {
  date: string; amount: number; type: string;
  category_id?: number | null; account_id?: number | null;
  to_account_id?: number | null; note?: string
}): Promise<void> {
  await fetch(`${BASE}/transactions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
}

export async function reorderAccounts(order: { id: number; sort_order: number }[]): Promise<void> {
  await fetch(`${BASE}/accounts/reorder`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order })
  })
}

export async function getMonthStats(month: string): Promise<MonthStats> {
  const r = await fetch(`${BASE}/stats/monthly?month=${month}`)
  return r.json()
}
