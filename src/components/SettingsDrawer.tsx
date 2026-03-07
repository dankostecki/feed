'use client'

import { useEffect } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  readCount: number
  bookmarkCount: number
  theme: 'dark' | 'light'
  autoRefresh: boolean
  onClearRead: () => void
  onClearBookmarks: () => void
  onClearAll: () => void
  onThemeToggle: () => void
  onAutoRefreshToggle: () => void
}

function Row({ label, value, action, actionLabel, danger = false }: {
  label: string; value?: string | number; action?: () => void; actionLabel?: string; danger?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border-dim)' }}>
      <div className="flex flex-col leading-none gap-0.5">
        <span className="text-[11px] font-mono" style={{ color: 'var(--text-hi)' }}>{label}</span>
        {value !== undefined && (
          <span className="text-[10px] font-mono tabular-nums" style={{ color: 'var(--text-ui)' }}>{value}</span>
        )}
      </div>
      {action && actionLabel && (
        <button
          onClick={action}
          className="px-2.5 py-1 text-[10px] font-bold tracking-widest border rounded-sm font-mono transition-all duration-150 shrink-0"
          style={
            danger
              ? { color: '#f87171', borderColor: '#f8717140', backgroundColor: 'transparent' }
              : { color: 'var(--text-ui)', borderColor: 'var(--border)' }
          }
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-0">
      <span
        className="text-[9px] font-bold tracking-[0.2em] uppercase mb-1 font-mono"
        style={{ color: 'var(--text-dim)' }}
      >
        {title}
      </span>
      {children}
    </section>
  )
}

export default function SettingsDrawer({
  open, onClose,
  readCount, bookmarkCount,
  theme, autoRefresh,
  onClearRead, onClearBookmarks, onClearAll,
  onThemeToggle, onAutoRefreshToggle,
}: Props) {
  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 transition-opacity duration-200"
        style={{
          backgroundColor: 'rgba(0,0,0,0.55)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col font-mono"
        style={{
          width: 'min(340px, 100vw)',
          backgroundColor: 'var(--surface)',
          borderLeft: '1px solid var(--border)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.22s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-ui)' }}>
              <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/>
            </svg>
            <span className="text-[12px] font-bold tracking-[0.18em] uppercase" style={{ color: 'var(--text-hi)' }}>
              Settings
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center border rounded-sm text-[12px] transition-all"
            style={{ color: 'var(--text-ui)', borderColor: 'var(--border)' }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-6">

          <Section title="Display">
            <Row
              label="Theme"
              value={theme === 'dark' ? 'Dark mode' : 'Light mode'}
              action={onThemeToggle}
              actionLabel={theme === 'dark' ? '☀ LIGHT' : '☾ DARK'}
            />
            <Row
              label="Auto-refresh"
              value={autoRefresh ? 'Every 60 seconds' : 'Off'}
              action={onAutoRefreshToggle}
              actionLabel={autoRefresh ? 'TURN OFF' : 'TURN ON'}
            />
          </Section>

          <Section title="Local Data">
            <Row
              label="Read articles"
              value={`${readCount} marked as read`}
              action={readCount > 0 ? onClearRead : undefined}
              actionLabel="CLEAR"
            />
            <Row
              label="Bookmarks"
              value={`${bookmarkCount} saved`}
              action={bookmarkCount > 0 ? onClearBookmarks : undefined}
              actionLabel="CLEAR"
            />
            <div className="pt-3">
              <button
                onClick={onClearAll}
                className="w-full py-2 text-[11px] font-bold tracking-widest border rounded-sm transition-all duration-150"
                style={{ color: '#f87171', borderColor: '#f8717130', backgroundColor: '#f8717108' }}
              >
                CLEAR ALL LOCAL DATA
              </button>
            </div>
          </Section>

          <Section title="About">
            <div className="pt-1 flex flex-col gap-1.5">
              {[
                ['App', 'CB Terminal v1.0'],
                ['Sources', 'FED · ECB · NBP'],
                ['Storage', 'Browser localStorage only'],
                ['Network', 'CORS proxy — corsproxy.io / allorigins.win'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-2">
                  <span className="text-[10px]" style={{ color: 'var(--text-ui)' }}>{k}</span>
                  <span className="text-[10px] text-right" style={{ color: 'var(--text-md)' }}>{v}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div
          className="px-4 py-3 flex-shrink-0"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
            Data stored locally · No tracking · No server
          </span>
        </div>
      </div>
    </>
  )
}
