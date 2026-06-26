import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getAccounts, getCategories, getTransaction, updateTransaction, deleteTransaction } from '../api'
import type { Account, Category } from '../types'

type TxType = 'EXPENSE' | 'INCOME' | 'TRANSFER'

export default function EditTransaction() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [type, setType] = useState<TxType>('EXPENSE')
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState<number | ''>('')
  const [toAccountId, setToAccountId] = useState<number | ''>('')
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const inFlight = useRef(false)

  useEffect(() => {
    Promise.all([getAccounts(), getCategories(), getTransaction(Number(id))])
      .then(([accs, cats, tx]) => {
        setAccounts(accs)
        setCategories(cats)
        setType(tx.type as TxType)
        setAmount(String(tx.amount))
        setAccountId(tx.account_id ?? '')
        setToAccountId(tx.to_account_id ?? '')
        setCategoryId(tx.category_id ?? '')
        setNote(tx.note || '')
        setDate(tx.date)
        setLoaded(true)
      })
      .catch(() => navigate('/'))
  }, [id])

  const filteredCats = categories.filter(c => c.type === type)
  const canSave = !!amount && Number(amount) > 0 && accountId !== '' &&
    (type !== 'TRANSFER' || toAccountId !== '') &&
    (type === 'TRANSFER' || categoryId !== '')

  const handleSave = async () => {
    if (!canSave || inFlight.current) return
    inFlight.current = true
    setSaving(true)
    try {
      await updateTransaction(Number(id), {
        date, amount: Number(amount), type,
        category_id: type === 'TRANSFER' ? null : Number(categoryId),
        account_id: Number(accountId),
        to_account_id: type === 'TRANSFER' ? Number(toAccountId) : null,
        note
      })
      navigate(-1)
    } finally {
      inFlight.current = false
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Удалить операцию?')) return
    await deleteTransaction(Number(id))
    navigate('/')
  }

  if (!loaded) return <div className="loading">Загрузка...</div>

  return (
    <div>
      <div className="screen-title" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <button onClick={() => navigate(-1)} style={{ background:'none', border:'none', color:'var(--dark-text2)', fontSize:22, cursor:'pointer', padding:'0 4px' }}>‹</button>
        <span>Редактировать</span>
        <button onClick={handleDelete} style={{ background:'none', border:'none', color:'#8B1A1A', fontSize:13, cursor:'pointer' }}>Удалить</button>
      </div>

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
            value={amount} onChange={e => setAmount(e.target.value)}
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
        </div>

        <button className="save-btn" onClick={handleSave} disabled={!canSave || saving}>
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </div>
  )
}
