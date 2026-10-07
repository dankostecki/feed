'use client'

import { useEffect, useState } from 'react'
import { NewsItem, Source } from '@/lib/rss'
import { buildJevExport, itemsInWindow } from '@/lib/jevExport'
import { SOURCE_COLOR } from '@/lib/feedMeta'
import { VoiceSettings, ALL_SOURCES, voicesFor, speak, stopSpeaking, Lang } from '@/lib/speech'

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
  viewMode?: 'GRID' | 'COLUMNS'
  onViewModeChange?: (v: 'GRID' | 'COLUMNS') => void
  onShowSaved?: () => void
  onScrollToTop?: () => void
  onSearch?: () => void
  onRefresh?: () => void
  loading?: boolean
  sourceOrder?: Source[]
  onSourceOrderChange?: (order: Source[]) => void
  items?: NewsItem[]
  voiceOn?: boolean
  onVoiceToggle?: () => void
  voiceSettings?: VoiceSettings
  onVoiceSettingsChange?: (v: VoiceSettings) => void
  voices?: SpeechSynthesisVoice[]
}

function Row({ label, value, action, actionLabel, danger = false }: {
  label: string; value?: string | number; action?: () => void; actionLabel?: string; danger?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border-dim)' }}>
      <div className="flex flex-col leading-none gap-0.5">
        <span className="text-[11px] font-mono" style={{ color: 'var(--text-hi)' }}>{label}</span>
        {value !== undefined && (
          <span className="text-[12px] font-mono tabular-nums" style={{ color: 'var(--text-ui)' }}>{value}</span>
        )}
      </div>
      {action && actionLabel && (
        <button
          onClick={action}
          className="px-2.5 py-1 text-[12px] font-bold tracking-widest border rounded-sm font-mono transition-all duration-150 shrink-0"
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

const BTN_STYLE = { color: 'var(--text-ui)', borderColor: 'var(--border)' }

function JevExportRow({ items, hours }: { items: NewsItem[]; hours: number }) {
  const [copied, setCopied] = useState<string | null>(null)
  const count = itemsInWindow(items, hours).length

  function download() {
    const { file, filename } = buildJevExport(items, hours)
    const url = URL.createObjectURL(new Blob([file], { type: 'text/plain;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function copy(part: 'state' | 'questions') {
    const exp = buildJevExport(items, hours)
    try {
      await navigator.clipboard.writeText(exp[part])
      setCopied(part); setTimeout(() => setCopied(null), 1500)
    } catch {
      download()
    }
  }

  const btn = 'px-2.5 py-1 text-[12px] font-bold tracking-widest border rounded-sm font-mono transition-all duration-150 shrink-0 disabled:opacity-40'
  return (
    <div className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border-dim)' }}>
      <div className="flex flex-col leading-none gap-0.5">
        <span className="text-[11px] font-mono" style={{ color: 'var(--text-hi)' }}>Last {hours}h</span>
        <span className="text-[12px] font-mono tabular-nums" style={{ color: 'var(--text-ui)' }}>{count} headlines</span>
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={download} disabled={!count} className={btn} style={BTN_STYLE} title="Download .txt with State and Questions">TXT</button>
        <button onClick={() => copy('state')} disabled={!count} className={btn} style={BTN_STYLE} title="Copy the State field">
          {copied === 'state' ? 'COPIED' : 'STATE'}
        </button>
        <button onClick={() => copy('questions')} disabled={!count} className={btn} style={BTN_STYLE} title="Copy the Questions JSON">
          {copied === 'questions' ? 'COPIED' : 'QUESTIONS'}
        </button>
      </div>
    </div>
  )
}

const SELECT_CLS = 'bg-transparent border rounded-sm font-mono text-[12px] px-2 py-1.5 max-w-[60%] min-w-0'
const SELECT_STYLE = { color: 'var(--text-hi)', borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }

function VoiceSection({ on, onToggle, settings, onChange, voices }: {
  on: boolean; onToggle: () => void; settings: VoiceSettings; onChange: (v: VoiceSettings) => void; voices: SpeechSynthesisVoice[]
}) {
  const set = (patch: Partial<VoiceSettings>) => onChange({ ...settings, ...patch })
  const en = voicesFor(voices, 'en'), pl = voicesFor(voices, 'pl')
  const toggleSource = (src: typeof ALL_SOURCES[number]) =>
    set({ sources: settings.sources.includes(src) ? settings.sources.filter((x) => x !== src) : [...settings.sources, src] })
  const test = (lang: Lang) => {
    stopSpeaking()
    speak(lang === 'pl' ? 'Test polskiego głosu. Kurs złotego bez zmian.' : 'Reuters: Testing the English voice. Oil prices are steady.', lang, settings, voices)
  }
  const btn = 'px-2.5 py-1.5 text-[12px] font-bold tracking-widest border rounded-sm font-mono transition-all duration-150 shrink-0'
  const row = 'flex items-center justify-between gap-3 py-2.5'
  const line = { borderBottom: '1px solid var(--border-dim)' }
  const label = (t: string, sub?: string) => (
    <div className="flex flex-col leading-none gap-1 min-w-0">
      <span className="text-[12px] font-mono" style={{ color: 'var(--text-hi)' }}>{t}</span>
      {sub && <span className="text-[11px] font-mono" style={{ color: 'var(--text-ui)' }}>{sub}</span>}
    </div>
  )
  const voiceSelect = (lang: Lang, list: SpeechSynthesisVoice[], value: string, key: 'voiceEn' | 'voicePl') => (
    <div className={row} style={line}>
      {label(lang === 'pl' ? 'Polish voice' : 'English voice', lang === 'pl' ? 'NBP, Stooq' : 'FED, ECB, Reuters, Bloomberg, Axios')}
      <div className="flex items-center gap-1.5 min-w-0">
        {list.length > 0 ? (
          <select value={value} onChange={(e) => set({ [key]: e.target.value } as Partial<VoiceSettings>)} className={SELECT_CLS} style={SELECT_STYLE}>
            <option value="">Auto</option>
            {list.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>)}
          </select>
        ) : (
          <span className="text-[11px] font-mono" style={{ color: '#f87171' }}>{voices.length ? 'not installed' : 'loading…'}</span>
        )}
        <button onClick={() => test(lang)} className={btn} style={BTN_STYLE} title="Play a test sentence">TEST</button>
      </div>
    </div>
  )

  return (
    <Section title="Voice">
      <div className={row} style={line}>
        {label('Read new headlines aloud', on ? 'On · auto-refresh 60s' : 'Off · turn on again after reloading the page')}
        <button onClick={onToggle} className={btn}
          style={on ? { color: '#f59e0b', borderColor: '#f59e0b80', backgroundColor: '#f59e0b18' } : BTN_STYLE}>
          {on ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className="flex flex-col gap-2 py-2.5" style={line}>
        {label('Sources to read')}
        <div className="flex flex-wrap gap-1.5">
          {ALL_SOURCES.map((src) => {
            const active = settings.sources.includes(src)
            return (
              <button key={src} onClick={() => toggleSource(src)} className={btn}
                style={active
                  ? { color: SOURCE_COLOR[src], borderColor: SOURCE_COLOR[src] + '80', backgroundColor: SOURCE_COLOR[src] + '18' }
                  : { color: 'var(--text-ui)', borderColor: 'var(--border)', opacity: 0.6 }}>
                {src}
              </button>
            )
          })}
        </div>
      </div>

      {voiceSelect('en', en, settings.voiceEn, 'voiceEn')}
      {voiceSelect('pl', pl, settings.voicePl, 'voicePl')}
      {voices.length > 0 && pl.length === 0 && (
        <p className="text-[11px] font-mono leading-relaxed py-2" style={{ color: '#f87171' }}>
          No Polish voice in this browser — Polish headlines would sound wrong. Try Edge or Chrome, or add Polish speech in system settings.
        </p>
      )}

      <div className={row} style={line}>
        {label('Speed')}
        <select value={settings.rate} onChange={(e) => set({ rate: Number(e.target.value) })} className={SELECT_CLS} style={SELECT_STYLE}>
          {[0.8, 0.9, 1, 1.1, 1.25, 1.5].map((r) => <option key={r} value={r}>{r}×</option>)}
        </select>
      </div>
      <div className={row} style={line}>
        {label('Max per refresh', 'The rest is summed up as "i jeszcze N"')}
        <select value={settings.maxPerRefresh} onChange={(e) => set({ maxPerRefresh: Number(e.target.value) })} className={SELECT_CLS} style={SELECT_STYLE}>
          {[1, 2, 3, 5, 10].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
    </Section>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-0">
      <span
        className="text-[11px] font-bold tracking-[0.2em] uppercase mb-1 font-mono"
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
  viewMode, onViewModeChange, onShowSaved,
  onScrollToTop, onSearch, onRefresh, loading,
  sourceOrder, onSourceOrderChange, items,
  voiceOn, onVoiceToggle, voiceSettings, onVoiceSettingsChange, voices = [],
}: Props) {
  function moveSource(idx: number, dir: -1 | 1) {
    if (!sourceOrder || !onSourceOrderChange) return
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= sourceOrder.length) return
    const next = [...sourceOrder]
    ;[next[idx], next[newIdx]] = [next[newIdx], next[idx]]
    onSourceOrderChange(next)
  }
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

          {/* Jev export first: used on every visit */}
          {items && (
            <Section title="Export for Jev">
              <JevExportRow items={items} hours={4} />
              <JevExportRow items={items} hours={8} />
              <JevExportRow items={items} hours={24} />
              <p className="text-[12px] font-mono leading-relaxed pt-2" style={{ color: 'var(--text-ui)' }}>
                console.typesafe.ai/playground: STATE → State field, QUESTIONS → Questions field. Higher probability = more important.
              </p>
            </Section>
          )}

          {/* Quick actions — Home, Search, Refresh (useful when bottom nav is hidden by Chrome) */}
          {(onScrollToTop || onSearch || onRefresh) && (
            <Section title="Quick Actions">
              <div className="flex items-center gap-2 py-2.5" style={{ borderBottom: '1px solid var(--border-dim)' }}>
                {onScrollToTop && (
                  <button onClick={() => { onScrollToTop(); onClose() }}
                    className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-bold tracking-widest border rounded-sm font-mono transition-all duration-150"
                    style={{ color: 'var(--text-ui)', borderColor: 'var(--border)' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                    HOME
                  </button>
                )}
                {onSearch && (
                  <button onClick={() => { onSearch(); onClose() }}
                    className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-bold tracking-widest border rounded-sm font-mono transition-all duration-150"
                    style={{ color: 'var(--text-ui)', borderColor: 'var(--border)' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                    </svg>
                    SEARCH
                  </button>
                )}
                {onRefresh && (
                  <button onClick={() => { onRefresh(); onClose() }}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-bold tracking-widest border rounded-sm font-mono transition-all duration-150"
                    style={{ color: loading ? 'var(--text-dim)' : 'var(--text-ui)', borderColor: 'var(--border)' }}>
                    <svg width="13" height="13" className={loading ? 'animate-spin' : ''} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 11-6.219-8.56" />
                    </svg>
                    {loading ? 'SYNC…' : 'REFRESH'}
                  </button>
                )}
              </div>
            </Section>
          )}

          {/* Controls — view mode + bookmarks */}
          {viewMode && onViewModeChange && (
            <Section title="Controls">
              <div className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border-dim)' }}>
                <span className="text-[11px] font-mono" style={{ color: 'var(--text-hi)' }}>View mode</span>
                <div className="flex items-center rounded-sm overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  {(['GRID', 'COLUMNS'] as const).map((v) => (
                    <button key={v} onClick={() => { onViewModeChange(v); onClose() }}
                      className="px-3 py-1.5 text-[12px] font-bold tracking-widest font-mono transition-all duration-150"
                      style={viewMode === v
                        ? { color: 'var(--text-hi)', backgroundColor: theme === 'dark' ? '#0d1e35' : '#d8e8f4' }
                        : { color: 'var(--text-ui)', backgroundColor: 'transparent' }
                      }>{v}</button>
                  ))}
                </div>
              </div>
              {onShowSaved && (
                <div className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border-dim)' }}>
                  <div className="flex flex-col leading-none gap-0.5">
                    <span className="text-[11px] font-mono" style={{ color: 'var(--text-hi)' }}>Bookmarks</span>
                    <span className="text-[12px] font-mono tabular-nums" style={{ color: 'var(--text-ui)' }}>{bookmarkCount} saved</span>
                  </div>
                  <button onClick={onShowSaved}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-bold tracking-widest border rounded-sm font-mono transition-all duration-150"
                    style={{ color: '#f59e0b', borderColor: '#f59e0b40' }}>
                    ★ SAVED
                  </button>
                </div>
              )}
            </Section>
          )}

          {voiceSettings && onVoiceToggle && onVoiceSettingsChange && (
            <VoiceSection on={!!voiceOn} onToggle={onVoiceToggle} settings={voiceSettings} onChange={onVoiceSettingsChange} voices={voices} />
          )}

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

          {/* Source order */}
          {sourceOrder && onSourceOrderChange && (
            <Section title="Source Order">
              <div className="flex flex-col">
                {sourceOrder.map((src, i) => (
                  <div key={src} className="flex items-center gap-2 py-2" style={{ borderBottom: '1px solid var(--border-dim)' }}>
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: SOURCE_COLOR[src] }} />
                    <span className="text-[11px] font-mono font-bold tracking-widest flex-1" style={{ color: SOURCE_COLOR[src] }}>
                      {src}
                    </span>
                    <button
                      onClick={() => moveSource(i, -1)}
                      disabled={i === 0}
                      className="w-9 h-9 flex items-center justify-center border rounded-sm text-[11px] font-mono transition-all duration-150 active:scale-95"
                      style={{ color: i === 0 ? 'var(--text-dim)' : 'var(--text-ui)', borderColor: 'var(--border)', touchAction: 'manipulation' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 15l-6-6-6 6"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => moveSource(i, 1)}
                      disabled={i === sourceOrder.length - 1}
                      className="w-9 h-9 flex items-center justify-center border rounded-sm text-[11px] font-mono transition-all duration-150 active:scale-95"
                      style={{ color: i === sourceOrder.length - 1 ? 'var(--text-dim)' : 'var(--text-ui)', borderColor: 'var(--border)', touchAction: 'manipulation' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </Section>
          )}

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
                ['App', 'CB Terminal v1.2'],
                ['Sources', 'FED · ECB · NBP · REUTERS · BLOOMBERG · STOOQ · AXIOS'],
                ['Storage', 'Browser localStorage only'],
                ['Network', 'Vercel serverless API'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-2">
                  <span className="text-[12px]" style={{ color: 'var(--text-ui)' }}>{k}</span>
                  <span className="text-[12px] text-right" style={{ color: 'var(--text-md)' }}>{v}</span>
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
          <span className="text-[12px]" style={{ color: 'var(--text-dim)' }}>
            Data stored locally · No tracking
          </span>
        </div>
      </div>
    </>
  )
}
