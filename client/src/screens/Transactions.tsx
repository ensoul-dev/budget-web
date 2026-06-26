import { useEffect, useState, useCallback } from 'react'
import { getTransactions, deleteTransaction } from '../api'
import type { Transaction } from '../types'
import { fmt, fmtDateFull, fmtMonth, currentMonth, addMonths, groupByDate } from '../utils'
import { TxRow } from './Dashboard'

export default function Transactions() {
  const [month, setMonth] = useState(currentMonth())
  const [txs, setTxs] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const LIMIT = 100

  const load = useCallback(async (m: string, off = 0) => {
    setLoading(true)
    const data = await getTransactions({ month: m, limit: LIMIT, offset: off })
    setTxs(off === 0 ? data.rows : prev => [...prev, ...data.rows])
    setTotal(data.total)
    setLoading(false)
  }, [])

  useEffect(() => { setOffset(0); load(month, 0) }, [month, load])

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить операцию?')) return
    await deleteTransaction(id)
    load(month, 0)
  }

  const income = txs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0)
  const expense = txs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0)
  const grouped = groupByDate(txs)

  return (
    <div>
      <div className="screen-title">Операции</div>

      <div className="month-nav">
        <button className="month-btn" onClick={() => setMonth(m => addMonths(m, -1))}>‹</button>
        <span className="month-label">{fmtMonth(month)}</span>
        <button className="month-btn" onClick={() => setMonth(m => addMonths(m, 1))}>›</button>
      </div>

      <div className="summary-bar">
        <div className="summary-cell">
          <div className="summary-label">Доходы</div>
          <div className="summary-value c-income">+{fmt(income)}</div>
        </div>
        <div className="summary-cell">
          <div className="summary-label">Расходы</div>
          <div className="summary-value c-expense">-{fmt(expense)}</div>
        </div>
        <div className="summary-cell">
          <div className="summary-label">Итого</div>
          <div className={`summary-value ${income - expense < 0 ? 'c-expense' : 'c-income'}`}>{fmt(income - expense)}</div>
        </div>
      </div>

      {loading && txs.length === 0 && <div className="loading">Загрузка...</div>}
      {!loading && txs.length === 0 && <div className="empty">Нет операций за этот месяц</div>}

      {grouped.map(([date, rows]) => (
        <div className="warm-list" key={date}>
          <div className="warm-date-header">{fmtDateFull(date)}</div>
          {rows.map(tx => <TxRow key={tx.id} tx={tx} onDelete={() => handleDelete(tx.id)} />)}
        </div>
      ))}

      {txs.length < total && (
        <div style={{ padding: '12px 12px 0' }}>
          <button
            onClick={() => { const o = offset + LIMIT; setOffset(o); load(month, o) }}
            style={{ width:'100%', padding:'12px', background:'var(--dark-surface)', border:'1px solid var(--dark-sep)', borderRadius:10, color:'var(--dark-text2)', cursor:'pointer', fontSize:14 }}
          >
            Ещё ({total - txs.length})
          </button>
        </div>
      )}
    </div>
  )
}
