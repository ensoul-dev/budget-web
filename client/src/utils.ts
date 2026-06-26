export function fmt(n: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'decimal',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  }).format(n) + ' ₽'
}

export function fmtDate(d: string): string {
  const months = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек']
  const dt = new Date(d + 'T00:00:00')
  return `${dt.getDate()} ${months[dt.getMonth()]}`
}

export function fmtDateShort(d: string): string {
  const dt = new Date(d + 'T00:00:00')
  return `${String(dt.getDate()).padStart(2,'0')}.${String(dt.getMonth()+1).padStart(2,'0')}`
}

export function fmtDateFull(d: string): string {
  const days = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб']
  const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
  const dt = new Date(d + 'T00:00:00')
  return `${days[dt.getDay()]}, ${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()} г.`
}

export function fmtMonth(m: string): string {
  const months = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
  const [y, mo] = m.split('-')
  return `${months[Number(mo) - 1]} ${y}`
}

export function txAmountClass(type: string): string {
  if (type === 'INCOME') return 'c-income'
  if (type === 'EXPENSE') return 'c-expense'
  return 'c-transfer'
}

export function txSign(type: string): string {
  if (type === 'INCOME') return '+'
  if (type === 'EXPENSE') return '-'
  return ''
}

export function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function addMonths(m: string, delta: number): string {
  const [y, mo] = m.split('-').map(Number)
  const d = new Date(y, mo - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function groupByDate<T extends { date: string }>(items: T[]): [string, T[]][] {
  const map: Record<string, T[]> = {}
  for (const item of items) {
    if (!map[item.date]) map[item.date] = []
    map[item.date].push(item)
  }
  return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
}
