import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAccounts, getTransactions, reorderAccounts } from '../api'
import type { Account, Transaction } from '../types'
import { fmt, fmtDateFull, txAmountClass, txSign, groupByDate } from '../utils'

export default function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [txs, setTxs] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [sortMode, setSortMode] = useState(false)

  const reload = useCallback(() => {
    Promise.all([getAccounts(), getTransactions({ limit: 30 })]).then(([accs, t]) => {
      setAccounts(accs)
      setTxs(t.rows)
      setLoading(false)
    })
  }, [])

  useEffect(() => { reload() }, [reload])

  const total = accounts.reduce((s, a) => s + a.balance, 0)
  const grouped = groupByDate(txs)

  const move = async (idx: number, dir: -1 | 1) => {
    const next = idx + dir
    if (next < 0 || next >= accounts.length) return
    const arr = [...accounts]
    ;[arr[idx], arr[next]] = [arr[next], arr[idx]]
    setAccounts(arr)
    await reorderAccounts(arr.map((a, i) => ({ id: a.id, sort_order: i })))
  }

  if (loading) return <div className="loading">Загрузка...</div>

  return (
    <div>
      <div className="balance-header">
        <div className="balance-label">Общий баланс</div>
        <div className={`balance-amount ${total < 0 ? 'c-expense' : ''}`}>{fmt(total)}</div>
      </div>

      <div className="dark-section-header" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span>Счета</span>
        <button onClick={() => setSortMode(m => !m)}
          style={{ background:'none', border:'none', color: sortMode ? 'var(--income)' : 'var(--dark-text2)', fontSize:12, cursor:'pointer', padding:'0 4px' }}>
          {sortMode ? 'Готово' : 'Упорядочить'}
        </button>
      </div>

      <div className="dark-list">
        {accounts.map((a, idx) => (
          <div className="dark-row" key={a.id}>
            {sortMode ? (
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <button onClick={() => move(idx, -1)} disabled={idx === 0}
                  style={{ background:'none', border:'none', color:'var(--dark-text2)', fontSize:18, cursor:'pointer', padding:'0 2px', opacity: idx===0?0.3:1 }}>↑</button>
                <button onClick={() => move(idx, 1)} disabled={idx === accounts.length-1}
                  style={{ background:'none', border:'none', color:'var(--dark-text2)', fontSize:18, cursor:'pointer', padding:'0 2px', opacity: idx===accounts.length-1?0.3:1 }}>↓</button>
                <span className="dark-row-label">{a.emoji} {a.name}</span>
              </div>
            ) : (
              <span className="dark-row-label">{a.emoji} {a.name}</span>
            )}
            <span className={`dark-row-value ${a.balance < 0 ? 'c-expense' : ''}`}>{fmt(a.balance)}</span>
          </div>
        ))}
        <div className="dark-row">
          <span className="dark-row-label" style={{ color: 'var(--dark-text2)' }}>Всего</span>
          <span className={`dark-row-value ${total < 0 ? 'c-expense' : ''}`}>{fmt(total)}</span>
        </div>
      </div>

      <div className="dark-section-header" style={{ marginTop: 16 }}>Последние операции</div>
      {txs.length === 0 && <div className="empty">Нет операций</div>}
      {grouped.map(([date, rows]) => (
        <div className="warm-list" key={date}>
          <div className="warm-date-header">{fmtDateFull(date)}</div>
          {rows.map(tx => <TxRow key={tx.id} tx={tx} />)}
        </div>
      ))}
    </div>
  )
}

export function TxRow({ tx, onDelete }: { tx: Transaction; onDelete?: () => void }) {
  const navigate = useNavigate()
  const isTransfer = tx.type === 'TRANSFER'
  const name = isTransfer
    ? `${tx.account_name} → ${tx.to_account_name}`
    : (tx.category_name || tx.note || '—')
  const emoji = isTransfer ? '↔' : (tx.category_emoji || '📦')

  return (
    <div className="warm-tx-row" onClick={() => navigate('/edit/' + tx.id)} style={{ cursor:'pointer' }}>
      <div className="warm-tx-icon">{emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="warm-tx-name">{name}</div>
        {tx.note && !isTransfer && <div className="warm-tx-sub">{tx.note}</div>}
      </div>
      <div className={`warm-tx-amount ${txAmountClass(tx.type)}`}>
        {txSign(tx.type)}{fmt(tx.amount)}
      </div>
      {onDelete && (
        <button onClick={e => { e.stopPropagation(); onDelete() }}
          style={{ background:'none', border:'none', color:'#aaa', cursor:'pointer', fontSize:14, paddingLeft:8 }}>✕</button>
      )}
    </div>
  )
}
