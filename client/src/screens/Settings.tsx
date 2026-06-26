import { useRef, useState } from 'react'
import { importBackup, exportJSON, exportXLSX, seedDefaultCategories } from '../api'
import { lock, hasPin } from './PinLock'

export default function Settings() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  const handleExportXLSX = async () => {
    try { await exportXLSX() } catch { setStatus('Ошибка экспорта XLSX') }
  }

  const handleExportJSON = async () => {
    try { await exportJSON() } catch { setStatus('Ошибка экспорта JSON') }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!confirm(`Загрузить резервную копию "${file.name}"?\n\nВСЕ текущие данные будут заменены.`)) {
      e.target.value = ''
      return
    }
    setBusy(true)
    setStatus('Загружаю...')
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      const result = await importBackup(data)
      setStatus(`Готово: ${result.accounts} счетов, ${result.transactions} операций`)
      setTimeout(() => window.location.reload(), 1500)
    } catch {
      setStatus('Ошибка: файл повреждён или неверный формат')
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  const handleSeedCategories = async () => {
    const n = await seedDefaultCategories()
    if (n === 0) setStatus('Категории уже есть')
    else { setStatus(`Добавлено ${n} категорий`); setTimeout(() => window.location.reload(), 1200) }
  }

  const handleResetPin = () => {
    if (!confirm('Сбросить PIN? Придётся создать новый при следующем входе.')) return
    localStorage.removeItem('budget_pin')
    lock()
    window.location.reload()
  }

  return (
    <div>
      <div className="screen-title">Настройки</div>

      <div className="dark-section-header">Данные</div>
      <div className="dark-list">

        <div className="dark-row" onClick={handleExportXLSX} style={{ cursor:'pointer' }}>
          <span className="dark-row-label">📊 Скачать в Excel</span>
          <span className="dark-row-value" style={{ color:'var(--dark-text2)', fontSize:12 }}>XLSX</span>
        </div>

        <div className="dark-row" onClick={handleExportJSON} style={{ cursor:'pointer' }}>
          <span className="dark-row-label">💾 Резервная копия</span>
          <span className="dark-row-value" style={{ color:'var(--dark-text2)', fontSize:12 }}>JSON</span>
        </div>

        <div className="dark-row" onClick={() => fileRef.current?.click()}
          style={{ cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
          <span className="dark-row-label">📥 Загрузить резервную копию</span>
          <span className="dark-row-value" style={{ color:'var(--dark-text2)', fontSize:12 }}>JSON</span>
        </div>
        <input ref={fileRef} type="file" accept=".json" style={{ display:'none' }} onChange={handleImport} />

        <div className="dark-row" onClick={handleSeedCategories} style={{ cursor:'pointer' }}>
          <span className="dark-row-label">🏷️ Восстановить категории</span>
          <span className="dark-row-value" style={{ color:'var(--dark-text2)', fontSize:12 }}>если пусто</span>
        </div>

      </div>

      {status && (
        <div style={{ padding: '10px 16px', fontSize:13, color: status.startsWith('Ошибка') ? '#EF5350' : 'var(--income)' }}>
          {status}
        </div>
      )}

      <div className="dark-section-header" style={{ marginTop:16 }}>Безопасность</div>
      <div className="dark-list">
        {hasPin() ? (
          <div className="dark-row" onClick={handleResetPin} style={{ cursor:'pointer' }}>
            <span className="dark-row-label">🔑 Сбросить PIN-код</span>
          </div>
        ) : (
          <div className="dark-row" onClick={() => { lock(); window.location.reload() }} style={{ cursor:'pointer' }}>
            <span className="dark-row-label">🔑 Установить PIN-код</span>
          </div>
        )}
      </div>

      <div style={{ padding:'24px 16px', color:'var(--dark-text2)', fontSize:12, lineHeight:1.6 }}>
        Excel — для просмотра в таблицах (Google Sheets, Excel).<br/>
        Резервная копия (JSON) — для восстановления данных в этом приложении.<br/>
        Сохраняй файлы на Яндекс.Диск. При загрузке резервной копии текущие данные будут заменены.
      </div>
    </div>
  )
}
