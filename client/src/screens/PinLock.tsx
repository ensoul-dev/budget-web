import { useState } from 'react'

const PIN_KEY = 'budget_pin'
const UNLOCK_KEY = 'budget_unlocked_at'
const LOCK_AFTER_MS = 5 * 60 * 1000 // lock after 5 min in background

function getStoredPin() { return localStorage.getItem(PIN_KEY) }
function isUnlocked() {
  const t = localStorage.getItem(UNLOCK_KEY)
  if (!t) return false
  return Date.now() - Number(t) < LOCK_AFTER_MS
}
export function markUnlocked() { localStorage.setItem(UNLOCK_KEY, String(Date.now())) }
export function lock() { localStorage.removeItem(UNLOCK_KEY) }
export function hasPin() { return !!getStoredPin() }

function PinDots({ entered }: { entered: number }) {
  return (
    <div style={{ display:'flex', gap:16, justifyContent:'center', margin:'24px 0' }}>
      {[0,1,2,3].map(i => (
        <div key={i} style={{
          width: 16, height: 16, borderRadius: '50%',
          background: i < entered ? 'var(--income)' : 'var(--dark-sep)',
          border: '2px solid var(--dark-text2)'
        }} />
      ))}
    </div>
  )
}

function PinPad({ onPin }: { onPin: (pin: string) => void }) {
  const [entered, setEntered] = useState('')
  const [shake, setShake] = useState(false)

  const press = (d: string) => {
    if (entered.length >= 4) return
    const next = entered + d
    setEntered(next)
    if (next.length === 4) {
      setTimeout(() => {
        onPin(next)
        setEntered('')
        setShake(false)
      }, 100)
    }
  }

  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫']

  return (
    <div style={{ userSelect:'none' }}>
      <PinDots entered={entered.length} />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, maxWidth:280, margin:'0 auto' }}>
        {keys.map((k, i) => k === '' ? <div key={i} /> : (
          <button key={i} onClick={() => k === '⌫' ? setEntered(e => e.slice(0,-1)) : press(k)}
            style={{
              padding:'18px 0', fontSize: k === '⌫' ? 20 : 24, fontWeight:600,
              background:'var(--dark-surface)', border:'1px solid var(--dark-sep)',
              borderRadius:12, color:'var(--dark-text)', cursor:'pointer'
            }}>{k}</button>
        ))}
      </div>
    </div>
  )
}

interface Props {
  onUnlock: () => void
}

export default function PinLock({ onUnlock }: Props) {
  const storedPin = getStoredPin()
  const [step, setStep] = useState<'enter'|'set1'|'set2'>(storedPin ? 'enter' : 'set1')
  const [firstPin, setFirstPin] = useState('')
  const [error, setError] = useState('')

  const handle = (pin: string) => {
    if (step === 'enter') {
      if (pin === storedPin) {
        markUnlocked()
        onUnlock()
      } else {
        setError('Неверный PIN')
        setTimeout(() => setError(''), 1500)
      }
    } else if (step === 'set1') {
      setFirstPin(pin)
      setStep('set2')
      setError('')
    } else {
      if (pin === firstPin) {
        localStorage.setItem(PIN_KEY, pin)
        markUnlocked()
        onUnlock()
      } else {
        setStep('set1')
        setFirstPin('')
        setError('PIN не совпал — попробуй снова')
        setTimeout(() => setError(''), 2000)
      }
    }
  }

  const titles: Record<typeof step, string> = {
    enter: 'Введите PIN',
    set1: 'Создайте PIN',
    set2: 'Повторите PIN'
  }

  return (
    <div style={{
      minHeight: '100dvh', display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      background:'var(--dark-bg)', padding:24
    }}>
      <div style={{ fontSize:48, marginBottom:8 }}>₽</div>
      <div style={{ fontSize:20, fontWeight:700, color:'var(--dark-text)', marginBottom:4 }}>
        Умный Бюджет
      </div>
      <div style={{ fontSize:14, color:'var(--dark-text2)', marginBottom:8 }}>
        {titles[step]}
      </div>
      {error && (
        <div style={{ fontSize:13, color:'#EF5350', marginBottom:4 }}>{error}</div>
      )}
      <PinPad onPin={handle} />
      {step === 'enter' && (
        <button
          onClick={() => {
            if (confirm('Сбросить PIN? Потребуется создать новый.')) {
              localStorage.removeItem(PIN_KEY)
              setStep('set1')
              setError('')
            }
          }}
          style={{ marginTop:32, background:'none', border:'none', color:'var(--dark-text2)', fontSize:12, cursor:'pointer' }}>
          Забыли PIN?
        </button>
      )}
    </div>
  )
}

export { isUnlocked, getStoredPin }
