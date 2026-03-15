'use client'

function formatDayLabel(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const day   = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diff  = today.getTime() - day.getTime()
  const days  = Math.round(diff / 86_400_000)

  if (days === 0) return 'TODAY'
  if (days === 1) return 'YESTERDAY'
  if (days < 7)   return date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
}

export function dayKey(date: Date): string {
  if (date.getTime() === 0) return 'unknown'
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function DateSeparator({ date, span }: { date: Date; span?: boolean }) {
  const label = date.getTime() === 0 ? 'UNDATED' : formatDayLabel(date)

  return (
    <div
      className={`flex items-center gap-3 py-2 px-1 select-none${span ? ' col-span-full' : ''}`}
    >
      <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
      <span
        className="font-mono text-[10px] font-bold tracking-[0.2em] shrink-0"
        style={{ color: 'var(--text-ui)' }}
      >
        {label}
      </span>
      <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
    </div>
  )
}
