'use client'

interface StatusError {
  feed: string
  message: string
}

interface Props {
  totalItems: number
  visibleItems: number
  loading: boolean
  lastUpdated: Date | null
  errors: StatusError[]
  autoRefresh: boolean
}

export default function StatusBar({
  totalItems,
  visibleItems,
  loading,
  lastUpdated,
  errors,
  autoRefresh,
}: Props) {
  const updatedStr = lastUpdated
    ? lastUpdated.toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
    : '—'

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(7,12,18,0.97)', borderTop: '1px solid #0d1822' }}
    >
      <div className="flex items-center justify-between px-4 py-1 gap-4">
        <div className="flex items-center gap-3 font-mono text-[10px] min-w-0">
          <span style={{ color: '#1a2d45' }}>
            {'SHOW '}
            <span style={{ color: '#2a4060' }}>{visibleItems}</span>
            {' / '}
            <span style={{ color: '#2a4060' }}>{totalItems}</span>
          </span>
          <span className="hidden sm:inline" style={{ color: '#0d1822' }}>│</span>
          <span className="hidden sm:inline" style={{ color: '#1a2d45' }}>
            {'UPD '}
            <span style={{ color: loading ? '#38bdf840' : '#243548' }}>
              {loading ? 'SYNCING…' : updatedStr}
            </span>
          </span>
          {autoRefresh && (
            <span style={{ color: '#1e4535' }}>● AUTO 60s</span>
          )}
        </div>

        <div className="flex items-center gap-3 font-mono text-[10px]">
          {errors.length > 0 && (
            <span
              style={{ color: 'rgba(248,113,113,0.4)', maxWidth: 260 }}
              className="truncate"
              title={errors.map((e) => `${e.feed}: ${e.message}`).join(' | ')}
            >
              {errors.length} ERR
            </span>
          )}
          <span style={{ color: '#0d1822' }}>FED·ECB·NBP v1.0</span>
        </div>
      </div>
    </footer>
  )
}
