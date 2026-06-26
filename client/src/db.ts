import Dexie, { type Table } from 'dexie'
import type { Account, Category, Transaction, MonthStats } from './types'

interface DBAccount {
  id?: number
  name: string
  emoji: string
  color_hex: string
  balance: number
  sort_order: number
}

interface DBCategory {
  id?: number
  name: string
  emoji: string
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER'
}

interface DBTransaction {
  id?: number
  date: string
  amount: number
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER'
  category_id: number | null
  account_id: number | null
  to_account_id: number | null
  note: string
}

class BudgetDB extends Dexie {
  accounts!: Table<DBAccount, number>
  categories!: Table<DBCategory, number>
  transactions!: Table<DBTransaction, number>

  constructor() {
    super('BudgetDB')
    this.version(1).stores({
      accounts: '++id, sort_order',
      categories: '++id, type',
      transactions: '++id, date, type, account_id, category_id',
    })
  }
}

export const db = new BudgetDB()

// ── Enrich ───────────────────────────────────────────────────────────────────

async function enrichAll(txs: DBTransaction[]): Promise<Transaction[]> {
  if (txs.length === 0) return []
  const [accs, cats] = await Promise.all([db.accounts.toArray(), db.categories.toArray()])
  const accMap = new Map(accs.map(a => [a.id!, a]))
  const catMap = new Map(cats.map(c => [c.id!, c]))
  return txs.map(tx => ({
    ...tx,
    id: tx.id!,
    account_name: tx.account_id != null ? accMap.get(tx.account_id)?.name : undefined,
    account_emoji: tx.account_id != null ? accMap.get(tx.account_id)?.emoji : undefined,
    to_account_name: tx.to_account_id != null ? accMap.get(tx.to_account_id)?.name : undefined,
    category_name: tx.category_id != null ? catMap.get(tx.category_id)?.name : undefined,
    category_emoji: tx.category_id != null ? catMap.get(tx.category_id)?.emoji : undefined,
  }))
}

// ── Balance helpers ───────────────────────────────────────────────────────────

async function applyBalance(
  tx: { type: string; amount: number; account_id?: number | null; to_account_id?: number | null },
  reverse = false,
) {
  const s = reverse ? -1 : 1
  const from = tx.account_id
  const to = tx.to_account_id

  if (from) {
    const acc = await db.accounts.get(from)
    if (acc) {
      const d = tx.type === 'INCOME' ? tx.amount * s : -(tx.amount * s)
      await db.accounts.update(from, { balance: Math.round((acc.balance + d) * 100) / 100 })
    }
  }
  if (tx.type === 'TRANSFER' && to) {
    const acc = await db.accounts.get(to)
    if (acc) await db.accounts.update(to, { balance: Math.round((acc.balance + tx.amount * s) * 100) / 100 })
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function isEmpty(): Promise<boolean> {
  return (await db.accounts.count()) === 0
}

export async function seedDefaultCategories(): Promise<number> {
  const existing = await db.categories.count()
  if (existing > 0) return 0
  const defaults: Omit<DBCategory, 'id'>[] = [
    { name: 'Еда', emoji: '🍞', type: 'EXPENSE' },
    { name: 'Ресторан, кафе', emoji: '☕', type: 'EXPENSE' },
    { name: 'Транспорт', emoji: '✈️', type: 'EXPENSE' },
    { name: 'Машина', emoji: '🚗', type: 'EXPENSE' },
    { name: 'Хоз расходы', emoji: '🏠', type: 'EXPENSE' },
    { name: 'Одежда', emoji: '👗', type: 'EXPENSE' },
    { name: 'Лечение', emoji: '💊', type: 'EXPENSE' },
    { name: 'Косметолог', emoji: '💅', type: 'EXPENSE' },
    { name: 'Спорт', emoji: '⚽', type: 'EXPENSE' },
    { name: 'Развлечения', emoji: '🎉', type: 'EXPENSE' },
    { name: 'Подарки', emoji: '🎁', type: 'EXPENSE' },
    { name: 'Связь, Интернет', emoji: '📡', type: 'EXPENSE' },
    { name: 'Электроника', emoji: '📱', type: 'EXPENSE' },
    { name: 'Учёба', emoji: '📚', type: 'EXPENSE' },
    { name: 'Налоги, гос. услуги', emoji: '🏛️', type: 'EXPENSE' },
    { name: 'Прочее', emoji: '📦', type: 'EXPENSE' },
    { name: 'Зарплата', emoji: '💰', type: 'INCOME' },
    { name: 'Самозанятость', emoji: '💼', type: 'INCOME' },
    { name: 'Подарок', emoji: '🎁', type: 'INCOME' },
    { name: 'Прочие доходы', emoji: '📦', type: 'INCOME' },
  ]
  await db.categories.bulkAdd(defaults)
  return defaults.length
}

export async function getAccounts(): Promise<Account[]> {
  const accs = await db.accounts.orderBy('sort_order').toArray()
  return accs.map(a => ({ ...a, id: a.id! }))
}

export async function getCategories(): Promise<Category[]> {
  const cats = await db.categories.orderBy('name').toArray()
  return cats.map(c => ({ ...c, id: c.id!, type: (c.type as string).toUpperCase() as Category['type'] }))
}

export async function getTransactions(params: {
  limit?: number
  offset?: number
  month?: string
  account_id?: number
  category_id?: number
  type?: string
} = {}): Promise<{ rows: Transaction[]; total: number }> {
  let all = await db.transactions.toArray()
  all.sort((a, b) => b.date.localeCompare(a.date) || (b.id ?? 0) - (a.id ?? 0))

  if (params.month) all = all.filter(tx => tx.date.startsWith(params.month!))
  if (params.account_id != null) all = all.filter(tx => tx.account_id === params.account_id || tx.to_account_id === params.account_id)
  if (params.category_id != null) all = all.filter(tx => tx.category_id === params.category_id)
  if (params.type) all = all.filter(tx => tx.type === params.type)

  const total = all.length
  const off = params.offset ?? 0
  const limited = params.limit ? all.slice(off, off + params.limit) : all
  return { rows: await enrichAll(limited), total }
}

export async function getTransaction(id: number): Promise<Transaction> {
  const tx = await db.transactions.get(id)
  if (!tx) throw new Error(`Transaction ${id} not found`)
  const [res] = await enrichAll([tx])
  return res
}

export async function addTransaction(data: {
  date: string; amount: number; type: string
  category_id?: number | null; account_id?: number | null
  to_account_id?: number | null; note?: string
}): Promise<{ id: number }> {
  let newId!: number
  await db.transaction('rw', db.accounts, db.transactions, async () => {
    newId = (await db.transactions.add({
      date: data.date,
      amount: data.amount,
      type: data.type as DBTransaction['type'],
      category_id: data.category_id ?? null,
      account_id: data.account_id ?? null,
      to_account_id: data.to_account_id ?? null,
      note: data.note ?? '',
    })) as number
    await applyBalance(data)
  })
  return { id: newId }
}

export async function updateTransaction(id: number, data: {
  date: string; amount: number; type: string
  category_id?: number | null; account_id?: number | null
  to_account_id?: number | null; note?: string
}): Promise<void> {
  await db.transaction('rw', db.accounts, db.transactions, async () => {
    const old = await db.transactions.get(id)
    if (!old) return
    await applyBalance(old, true)
    await db.transactions.update(id, {
      date: data.date,
      amount: data.amount,
      type: data.type as DBTransaction['type'],
      category_id: data.category_id ?? null,
      account_id: data.account_id ?? null,
      to_account_id: data.to_account_id ?? null,
      note: data.note ?? '',
    })
    await applyBalance(data)
  })
}

export async function deleteTransaction(id: number): Promise<void> {
  await db.transaction('rw', db.accounts, db.transactions, async () => {
    const tx = await db.transactions.get(id)
    if (!tx) return
    await applyBalance(tx, true)
    await db.transactions.delete(id)
  })
}

export async function reorderAccounts(order: { id: number; sort_order: number }[]): Promise<void> {
  await db.transaction('rw', db.accounts, async () => {
    for (const { id, sort_order } of order) await db.accounts.update(id, { sort_order })
  })
}

export async function getMonthStats(month: string): Promise<MonthStats> {
  const txs = await db.transactions.filter(tx => tx.date.startsWith(month)).toArray()
  const cats = await db.categories.toArray()
  const catMap = new Map(cats.map(c => [c.id!, c]))

  let income = 0, expense = 0
  const byCat = new Map<number, { id: number; name: string; emoji: string; total: number; type: string }>()

  for (const tx of txs) {
    if (tx.type !== 'INCOME' && tx.type !== 'EXPENSE') continue
    if (tx.type === 'INCOME') income += tx.amount
    else expense += tx.amount

    if (tx.category_id != null) {
      const c = catMap.get(tx.category_id)
      if (c) {
        const e = byCat.get(tx.category_id) ?? { id: c.id!, name: c.name, emoji: c.emoji, total: 0, type: tx.type }
        byCat.set(tx.category_id, { ...e, total: e.total + tx.amount })
      }
    }
  }

  return { income, expense, byCategory: [...byCat.values()].sort((a, b) => b.total - a.total) }
}

export async function importBackup(data: {
  version?: number
  accounts: Array<{ id: number; name: string; emoji: string; color_hex: string; balance: number; sort_order?: number }>
  categories: Array<{ id: number; name: string; emoji: string; type: string }>
  transactions: Array<{ id: number; date: string; amount: number; type: string; category_id: number | null; account_id: number | null; to_account_id: number | null; note?: string }>
}): Promise<{ ok: boolean; accounts: number; transactions: number }> {
  if (!data.accounts || !data.categories || !data.transactions) throw new Error('invalid backup')

  await db.transaction('rw', db.accounts, db.categories, db.transactions, async () => {
    await db.transactions.clear()
    await db.categories.clear()
    await db.accounts.clear()

    await db.accounts.bulkAdd(
      data.accounts.map(a => ({ id: a.id, name: a.name, emoji: a.emoji, color_hex: a.color_hex, balance: a.balance, sort_order: a.sort_order ?? 0 }))
    )
    await db.categories.bulkAdd(
      data.categories.map(c => ({ id: c.id, name: c.name, emoji: c.emoji, type: (c.type as string).toUpperCase() as DBCategory['type'] }))
    )
    await db.transactions.bulkAdd(
      data.transactions.map(t => ({ id: t.id, date: t.date, amount: t.amount, type: t.type as DBTransaction['type'], category_id: t.category_id, account_id: t.account_id, to_account_id: t.to_account_id, note: t.note ?? '' }))
    )
  })
  return { ok: true, accounts: data.accounts.length, transactions: data.transactions.length }
}

export async function exportJSON(): Promise<void> {
  const [accounts, categories, transactions] = await Promise.all([
    db.accounts.orderBy('sort_order').toArray(),
    db.categories.orderBy('id').toArray(),
    db.transactions.orderBy('date').toArray(),
  ])
  const payload = { version: 1, exported_at: new Date().toISOString(), accounts, categories, transactions }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `budget-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportXLSX(): Promise<void> {
  const { default: XLSX } = await import('xlsx')
  const [accs, cats, txs] = await Promise.all([
    db.accounts.orderBy('sort_order').toArray(),
    db.categories.toArray(),
    db.transactions.orderBy('date').reverse().toArray(),
  ])
  const accMap = new Map(accs.map(a => [a.id!, a]))
  const catMap = new Map(cats.map(c => [c.id!, c]))

  const rows = txs.map(tx => ({
    'Дата': tx.date,
    'Тип': tx.type === 'EXPENSE' ? 'Расход' : tx.type === 'INCOME' ? 'Доход' : 'Перевод',
    'Категория': tx.category_id != null ? (catMap.get(tx.category_id)?.name ?? '') : '',
    'Сумма': tx.type === 'EXPENSE' ? -tx.amount : tx.amount,
    'Счёт': tx.account_id != null ? (accMap.get(tx.account_id)?.name ?? '') : '',
    'Счёт (куда)': tx.to_account_id != null ? (accMap.get(tx.to_account_id)?.name ?? '') : '',
    'Заметка': tx.note ?? '',
  }))
  const accRows = accs.map(a => ({ 'Счёт': a.name, 'Баланс': a.balance }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Операции')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(accRows), 'Счета')
  XLSX.writeFile(wb, `budget-${new Date().toISOString().slice(0, 10)}.xlsx`)
}
