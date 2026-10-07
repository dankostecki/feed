'use client'

import { useEffect, useState } from 'react'
import { NewsItem } from '@/lib/rss'
import NewsCard from './NewsCard'

interface Ranked {
  id: string; title: string; link: string; source: NewsItem['source']; feedLabel: string; pubDate: string; probability: number
}
interface Ranking { hours: number; generatedAt: string; count: number; model: string; top: Ranked[] }
type State = { status: 'loading' } | { status: 'error'; code: string; message: string } | { status: 'ok'; data: Ranking }

interface Props {
  hours: number
  onHours: (h: number) => void
  onBack: () => void
  readIds: Set<string>
  bookmarkIds: Set<string>
  onRead: (id: string) => void
  onBookmark: (id: string) => void
}

const ERRORS: Record<string, string> = {
  not_configured: 'Jev API key is not set. In Vercel: project feed → Settings → Environment Variables → add TYPESAFE_API_KEY, then redeploy.',
  unauthorized: 'Jev rejected the API key. Check TYPESAFE_API_KEY in Vercel (a rotated key needs a redeploy).',
  rate_limited: 'Jev rate limit reached. Try again in a minute.',
}

const utcTime = (iso: string) => new Date(iso).toISOString().slice(11, 16) + ' UTC'

// Top headlines of the last N hours, ranked by TypeSafe Jev via /api/jev
export default function JevTop({ hours, onHours, onBack, readIds, bookmarkIds, onRead, onBookmark }: Props) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    fetch(`/api/jev?hours=${hours}`)
      .then(async (r) => {
        const body = await r.json().catch(() => null)
        if (cancelled) return
        if (!r.ok || !body) setState({ status: 'error', code: body?.error ?? 'upstream', message: body?.message ?? `HTTP ${r.status}` })
        else setState({ status: 'ok', data: body as Ranking })
      })
      .catch(() => { if (!cancelled) setState({ status: 'error', code: 'network', message: 'Cannot reach the server' }) })
    return () => { cancelled = true }
  }, [hours, attempt])

  // Escape → back to the feed
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (e.key === 'Escape' && tag !== 'INPUT' && tag !== 'TEXTAREA') onBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onBack])

  const btn = 'px-3 min-h-[36px] text-[12px] font-bold tracking-widest border rounded-sm font-mono transition-all duration-150'
  const maxP = state.status === 'ok' ? Math.max(...state.data.top.map((t) => t.probability), 0.0001) : 1

  return (
    <section className="max-w-[900px] mx-auto w-full flex flex-col gap-3" aria-label={`Top news, last ${hours} hours`}>
      {/* Header: back, title, window switch */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1">
        <button onClick={onBack} className={btn} style={{ color: 'var(--text-hi)', borderColor: 'var(--border)' }} title="Back to the feed (Esc)">
          ← BACK
        </button>
        <div className="flex flex-col leading-tight min-w-0 flex-1">
          <span className="text-[14px] font-bold tracking-widest font-mono whitespace-nowrap" style={{ color: '#f59e0b' }}>TOP NEWS · LAST {hours}H</span>
          <span className="text-[12px] font-mono" style={{ color: 'var(--text-ui)' }}>
            {state.status === 'ok'
              ? `ranked by Jev · ${state.data.count} headlines · ${utcTime(state.data.generatedAt)}`
              : state.status === 'loading' ? 'Jev is ranking the headlines…' : 'ranking failed'}
          </span>
        </div>
        <div className="flex gap-1.5 w-full sm:w-auto" role="group" aria-label="Time window">
          {[4, 8, 24].map((h) => (
            <button key={h} onClick={() => onHours(h)} className={btn} aria-pressed={h === hours}
              style={h === hours
                ? { color: '#f59e0b', borderColor: '#f59e0b80', backgroundColor: '#f59e0b18' }
                : { color: 'var(--text-ui)', borderColor: 'var(--border)' }}>
              {h}H
            </button>
          ))}
        </div>
      </div>

      {state.status === 'loading' && (
        <div className="flex flex-col gap-2" aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-sm" style={{ height: '6.5rem', backgroundColor: 'var(--skeleton)', border: '1px solid var(--border)' }} />
          ))}
        </div>
      )}

      {state.status === 'error' && (
        <div className="p-4 rounded-sm border font-mono text-[13px] leading-relaxed" role="alert"
          style={{ color: '#f87171', borderColor: '#f8717150', backgroundColor: '#f8717110' }}>
          {ERRORS[state.code] ?? state.message}
          <div className="mt-3">
            <button onClick={() => setAttempt((a) => a + 1)} className={btn} style={{ color: 'var(--text-hi)', borderColor: 'var(--border)' }}>TRY AGAIN</button>
          </div>
        </div>
      )}

      {state.status === 'ok' && state.data.top.length === 0 && (
        <p className="py-16 text-center font-mono text-[13px]" style={{ color: 'var(--text-ui)' }}>No headlines in the last {hours}h.</p>
      )}

      {state.status === 'ok' && state.data.top.length > 0 && (
        <ol className="flex flex-col gap-2.5">
          {state.data.top.map((r, i) => {
            const item: NewsItem = { ...r, description: '', pubDate: new Date(r.pubDate) }
            return (
              <li key={r.id} className="flex gap-2.5 sm:gap-3 items-stretch">
                <div className="flex flex-col items-center justify-start pt-3 w-10 sm:w-12 shrink-0 font-mono">
                  <span className="text-[18px] sm:text-[20px] font-bold tabular-nums" style={{ color: i < 3 ? '#f59e0b' : 'var(--text-md)' }}>#{i + 1}</span>
                  <span className="text-[11px] tabular-nums" style={{ color: 'var(--text-ui)' }} title="Jev probability that this is the most important headline">
                    {(r.probability * 100).toFixed(r.probability < 0.1 ? 1 : 0)}%
                  </span>
                  <span className="mt-1 w-1.5 flex-1 min-h-[24px] rounded-full overflow-hidden flex items-end" style={{ backgroundColor: 'var(--border-dim)' }} aria-hidden>
                    <span className="w-full rounded-full" style={{ height: `${Math.max(6, (r.probability / maxP) * 100)}%`, backgroundColor: '#f59e0b' }} />
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <NewsCard item={item} read={readIds.has(r.id)} bookmarked={bookmarkIds.has(r.id)} onRead={onRead} onBookmark={onBookmark} />
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
