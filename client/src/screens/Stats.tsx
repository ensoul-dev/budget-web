import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMonthStats, getTransactions } from '../api'
import type { MonthStats, Transaction } from '../types'
import { fmt, fmtMonth, fmtDateShort, currentMonth, addMonths } from '../utils'

type CatRow = MonthStats['byCategory'][0] & { _pct?: number }

function CategoryBlock({
  cat, month, color, sign
}: {
  cat: CatRow
  month: string
  color: string
  sign: string
}) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [txs, setTxs] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    if (!open && txs.length === 0) {
      setLoading(true)
      const data = await getTransactions({ month, category_id: cat.id, limit: 100 })
      setTxs(data.rows)
      setLoading(false)
    }
    setOpen(o => !o)
  }

  return (
    <div>
      <div
        className="dark-row"
        onClick={toggle}
        style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4, cursor: 'pointer' }}
      >
        <div className="stat-row-header">
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: 'var(--dark-text2)', marginRight: 2 }}>{open ? '▼' : '▶'}</span>
            {cat.emoji} {cat.name}
          </span>
          <span style={{ color }}>{sign}{fmt(cat.total)}</span>
        </div>
        <div className="stat-bar-track">
          <div className="stat-bar-fill" style={{ width: `${cat._pct ?? 0}%`, background: color }} />
        </div>
      </div>

      {open && (
        <div style={{ background: 'var(--warm-bg)', borderBottom: '1px solid var(--dark-sep)' }}>
          {loading && <div style={{ padding: '8px 16px', color: 'var(--dark-text2)', fontSize: 13 }}>Загрузка...</div>}
          {!loading && txs.length === 0 && <div style={{ padding: '8px 16px', color: 'var(--dark-text2)', fontSize: 13 }}>Нет операций</div>}
          {txs.map(tx => (
            <div key={tx.id}
              onClick={() => navigate('/edit/' + tx.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 16px 7px 28px',
                borderBottom: '1px dashed var(--warm-sep)',
                fontSize: 13, cursor: 'pointer'
              }}>
              <span style={{ color: 'var(--dark-text2)', minWidth: 48 }}>{fmtDateShort(tx.date)}</span>
              <span style={{ flex: 1, color: 'var(--warm-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tx.note || tx.account_name || '—'}
              </span>
              <span style={{ color, fontWeight: 600, whiteSpace: 'nowrap' }}>
                {sign}{fmt(tx.amount)}
              </span>
              <span style={{ color: 'var(--dark-text2)', fontSize: 11 }}>✎</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Stats() {
  const [month, setMonth] = useState(currentMonth())
  const [stats, setStats] = useState<MonthStats | null>(null)

  useEffect(() => { getMonthStats(month).then(setStats) }, [month])

  const expenses = stats?.byCategory.filter(c => c.type === 'EXPENSE') ?? []
  const incomes = stats?.byCategory.filter(c => c.type === 'INCOME') ?? []
  const maxExp = Math.max(...expenses.map(c => c.total), 1)
  const maxInc = Math.max(...incomes.map(c => c.total), 1)

  const expWithPct = expenses.map(c => ({ ...c, _pct: (c.total / maxExp) * 100 }))
  const incWithPct = incomes.map(c => ({ ...c, _pct: (c.total / maxInc) * 100 }))

  return (
    <div>
      <div className="screen-title">Статистика</div>

      <div className="month-nav">
        <button className="month-btn" onClick={() => setMonth(m => addMonths(m, -1))}>‹</button>
        <span className="month-label">{fmtMonth(month)}</span>
        <button className="month-btn" onClick={() => setMonth(m => addMonths(m, 1))}>›</button>
      </div>

      {stats && <>
        <div className="summary-bar">
          <div className="summary-cell">
            <div className="summary-label">Доходы</div>
            <div className="summary-value c-income">+{fmt(stats.income)}</div>
          </div>
          <div className="summary-cell">
            <div className="summary-label">Расходы</div>
            <div className="summary-value c-expense">-{fmt(stats.expense)}</div>
          </div>
        </div>

        {incWithPct.length > 0 && <>
          <div className="dark-section-header c-income">Доход: +{fmt(stats.income)}</div>
          <div className="dark-list">
            {incWithPct.map(c => (
              <CategoryBlock key={month + c.name + c.type} cat={c} month={month}
                color="var(--income)" sign="+" />
            ))}
          </div>
        </>}

        {expWithPct.length > 0 && <>
          <div className="dark-section-header c-expense" style={{ marginTop: 16 }}>Расход: -{fmt(stats.expense)}</div>
          <div className="dark-list">
            {expWithPct.map(c => (
              <CategoryBlock key={month + c.name + c.type} cat={c} month={month}
                color="var(--expense)" sign="-" />
            ))}
          </div>
        </>}
      </>}
    </div>
  )
}
