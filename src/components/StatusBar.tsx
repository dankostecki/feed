'use client'

interface Props {
  totalItems: number
  visibleItems: number
  loading: boolean
  lastUpdated: Date | null
  errors: { feed: string; message: string }[]
  autoRefresh: boolean
}

export default function StatusBar({ totalItems, visibleItems, loading, lastUpdated, errors, autoRefresh }: Props) {
  const updatedStr = lastUpdated
    ? lastUpdated.toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
    : '—'

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-sm"
      style={{ backgroundColor: 'var(--status-bg)', borderTop: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between px-4 py-1 gap-4">
        <div className="flex items-center gap-3 font-mono text-[10px]">
          <span style={{ color: 'var(--text-ui)' }}>
            SHOW{' '}
            <span style={{ color: 'var(--text-md)' }}>{visibleItems}</span>
            {' / '}
            <span style={{ color: 'var(--text-md)' }}>{totalItems}</span>
          </span>
          <span className="hidden sm:inline" style={{ color: 'var(--border)' }}>│</span>
          <span className="hidden sm:inline" style={{ color: 'var(--text-ui)' }}>
            UPD{' '}
            <span style={{ color: loading ? 'var(--text-dim)' : 'var(--text-md)' }}>
              {loading ? 'SYNCING…' : updatedStr}
            </span>
          </span>
          {autoRefresh && (
            <span style={{ color: '#34d399' }}>● AUTO 60s</span>
          )}
        </div>

        <div className="flex items-center gap-3 font-mono text-[10px]">
          {/* Some feeds failed to load (CORS / timeout) — shown as a quiet info dot */}
          {errors.length > 0 && (
            <span
              style={{ color: 'var(--text-dim)', cursor: 'help' }}
              title={`${errors.length} feed(s) couldn't be loaded (CORS / timeout — data from other sources is complete):\n${errors.map((e) => `• ${e.feed}: ${e.message}`).join('\n')}`}
            >
              ○ {errors.length} źródła niedostępne
            </span>
          )}
          <span style={{ color: 'var(--text-dim)' }}>FED·ECB·NBP v1.0</span>
        </div>
      </div>
    </footer>
  )
}
