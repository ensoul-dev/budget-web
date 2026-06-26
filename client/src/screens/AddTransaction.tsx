import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAccounts, getCategories, addTransaction, getRecentNotes } from '../api'
import type { Account, Category } from '../types'

type TxType = 'EXPENSE' | 'INCOME' | 'TRANSFER'

export default function AddTransaction() {
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [type, setType] = useState<TxType>('EXPENSE')
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState<number | ''>('')
  const [toAccountId, setToAccountId] = useState<number | ''>('')
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [note, setNote] = useState('')
  const [recentNotes, setRecentNotes] = useState<string[]>([])
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)
  const inFlight = useRef(false)

  useEffect(() => {
    getAccounts().then(setAccounts)
    getCategories().then(setCategories)
    getRecentNotes().then(setRecentNotes)
  }, [])

  const filteredCats = categories.filter(c => c.type === type)
  const canSave = !!amount && Number(amount) > 0 && accountId !== '' &&
    (type !== 'TRANSFER' || toAccountId !== '') &&
    (type === 'TRANSFER' || categoryId !== '')

  const handleSave = async () => {
    if (!canSave || inFlight.current) return
    inFlight.current = true
    setSaving(true)
    try {
      await addTransaction({
        date, amount: Number(amount), type,
        category_id: type === 'TRANSFER' ? null : Number(categoryId),
        account_id: Number(accountId),
        to_account_id: type === 'TRANSFER' ? Number(toAccountId) : null,
        note
      })
      navigate('/')
    } finally {
      inFlight.current = false
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="screen-title">Новая операция</div>
      <div className="form-screen">

        <div className="type-row">
          {(['EXPENSE','INCOME','TRANSFER'] as TxType[]).map(t => (
            <button key={t}
              className={`type-btn ${type === t ? `type-${t.toLowerCase()}` : ''}`}
              onClick={() => { setType(t); setCategoryId('') }}>
              {t === 'EXPENSE' ? '− Расход' : t === 'INCOME' ? '+ Доход' : '↔ Перевод'}
            </button>
          ))}
        </div>

        <div className="form-group">
          <label className="form-label">Сумма</label>
          <input className="form-input" type="number" inputMode="decimal"
            placeholder="0" value={amount} onChange={e => setAmount(e.target.value)}
            style={{ fontSize: 26, fontWeight: 700 }} />
        </div>

        <div className="form-group">
          <label className="form-label">Дата</label>
          <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">{type === 'TRANSFER' ? 'Откуда' : 'Счёт'}</label>
          <select className="form-select" value={accountId} onChange={e => setAccountId(Number(e.target.value))}>
            <option value="">Выберите счёт</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.emoji} {a.name}</option>)}
          </select>
        </div>

        {type === 'TRANSFER' && (
          <div className="form-group">
            <label className="form-label">Куда</label>
            <select className="form-select" value={toAccountId} onChange={e => setToAccountId(Number(e.target.value))}>
              <option value="">Выберите счёт</option>
              {accounts.filter(a => a.id !== Number(accountId)).map(a =>
                <option key={a.id} value={a.id}>{a.emoji} {a.name}</option>
              )}
            </select>
          </div>
        )}

        {type !== 'TRANSFER' && (
          <div className="form-group">
            <label className="form-label">Категория</label>
            <div className="categories-grid">
              {filteredCats.map(c => (
                <button key={c.id}
                  className={`cat-btn ${categoryId === c.id ? 'selected' : ''}`}
                  onClick={() => setCategoryId(c.id)}>
                  <span className="cat-emoji">{c.emoji}</span>
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Заметка</label>
          <input className="form-input" type="text" placeholder="Необязательно"
            value={note} onChange={e => setNote(e.target.value)} />
          {recentNotes.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:8 }}>
              {recentNotes.map(n => (
                <button key={n} type="button"
                  onClick={() => setNote(n)}
                  style={{
                    background: note === n ? 'var(--accent)' : 'var(--dark-card)',
                    color: note === n ? '#fff' : 'var(--dark-text2)',
                    border: `1px solid ${note === n ? 'var(--accent)' : 'var(--dark-border, #333)'}`,
                    borderRadius: 20, padding:'4px 12px', fontSize:12,
                    cursor:'pointer', whiteSpace:'nowrap'
                  }}>
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="save-btn" onClick={handleSave} disabled={!canSave || saving}>
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </div>
  )
}
