import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Dashboard from './screens/Dashboard'
import Transactions from './screens/Transactions'
import AddTransaction from './screens/AddTransaction'
import EditTransaction from './screens/EditTransaction'
import Stats from './screens/Stats'
import PinLock, { isUnlocked, markUnlocked, hasPin } from './screens/PinLock'
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

export default function App() {
  const [unlocked, setUnlocked] = useState(() => !hasPin() || isUnlocked())

  // Lock when app goes to background and comes back after 5 min
  useEffect(() => {
    if (!hasPin()) return
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !isUnlocked()) {
        setUnlocked(false)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  if (!unlocked) {
    return <PinLock onUnlock={() => { markUnlocked(); setUnlocked(true) }} />
  }

  return (
    <BrowserRouter>
      <OfflineBanner />
      <div className="app">
        <div className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/add" element={<AddTransaction />} />
            <Route path="/edit/:id" element={<EditTransaction />} />
            <Route path="/stats" element={<Stats />} />
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
        </nav>
      </div>
    </BrowserRouter>
  )
}
