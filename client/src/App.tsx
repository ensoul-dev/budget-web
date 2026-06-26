import { HashRouter, Routes, Route, NavLink } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import Dashboard from './screens/Dashboard'
import Transactions from './screens/Transactions'
import AddTransaction from './screens/AddTransaction'
import EditTransaction from './screens/EditTransaction'
import Stats from './screens/Stats'
import Settings from './screens/Settings'
import PinLock, { isUnlocked, markUnlocked, hasPin } from './screens/PinLock'
import { isEmpty, importBackup } from './db'
import './App.css'

function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine)
  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  if (!offline) return null
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      background: '#7B1FA2', color: '#fff', textAlign: 'center',
      fontSize: 12, padding: '4px 8px'
    }}>
      Офлайн — показаны кешированные данные
    </div>
  )
}

function ImportScreen({ onDone }: { onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setStatus('Загружаю...')
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      await importBackup(data)
      setStatus('Готово!')
      setTimeout(onDone, 800)
    } catch {
      setStatus('Ошибка: файл повреждён или неверный формат')
      setBusy(false)
    }
    e.target.value = ''
  }

  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      height:'100vh', padding:32, gap:20, background:'var(--bg)'
    }}>
      <div style={{ fontSize:56 }}>💰</div>
      <div style={{ fontSize:22, fontWeight:700, color:'var(--dark-text)' }}>Умный Бюджет</div>
      <div style={{ fontSize:14, color:'var(--dark-text2)', textAlign:'center', lineHeight:1.7 }}>
        Загрузите резервную копию (JSON),<br/>чтобы начать работу.<br/>
        <span style={{ fontSize:12, opacity:0.7 }}>Данные хранятся в браузере на этом устройстве.</span>
      </div>
      <button
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        style={{
          background:'var(--income)', color:'#fff', border:'none', borderRadius:14,
          padding:'14px 28px', fontSize:15, fontWeight:600, cursor: busy ? 'default' : 'pointer',
          opacity: busy ? 0.6 : 1
        }}>
        📥 Загрузить резервную копию
      </button>
      <input ref={fileRef} type="file" accept=".json" style={{ display:'none' }} onChange={handleImport} />
      {status && (
        <div style={{ fontSize:13, color: status.startsWith('Ошибка') ? '#EF5350' : 'var(--income)' }}>
          {status}
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [ready, setReady] = useState(false)
  const [needImport, setNeedImport] = useState(false)
  const [unlocked, setUnlocked] = useState(() => !hasPin() || isUnlocked())

  useEffect(() => {
    isEmpty().then(empty => {
      setNeedImport(empty)
      setReady(true)
    })
  }, [])

  useEffect(() => {
    if (!hasPin()) return
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !isUnlocked()) setUnlocked(false)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  if (!ready) return <div className="loading">Загрузка...</div>

  if (needImport) return <ImportScreen onDone={() => setNeedImport(false)} />

  if (!unlocked) return <PinLock onUnlock={() => { markUnlocked(); setUnlocked(true) }} />

  return (
    <HashRouter>
      <OfflineBanner />
      <div className="app">
        <div className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/add" element={<AddTransaction />} />
            <Route path="/edit/:id" element={<EditTransaction />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
        <nav className="bottom-nav">
          <NavLink to="/" end className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
            <span className="nav-icon">🏠</span>
            <span>Счета</span>
          </NavLink>
          <NavLink to="/transactions" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
            <span className="nav-icon">↑↓</span>
            <span>Операции</span>
          </NavLink>
          <NavLink to="/add" className="nav-add">+</NavLink>
          <NavLink to="/stats" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
            <span className="nav-icon">📊</span>
            <span>Статистика</span>
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
            <span className="nav-icon">⚙️</span>
            <span>Настройки</span>
          </NavLink>
        </nav>
      </div>
    </HashRouter>
  )
}
