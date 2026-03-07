'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchAllFeeds, NewsItem, Source } from '@/lib/rss'
import { SOURCE_COLOR } from '@/lib/feedMeta'
import NewsCard from './NewsCard'
import Column from './Column'
import FilterBar, { Filter } from './FilterBar'
import StatusBar from './StatusBar'

const READ_KEY = 'cbt:read-articles'
const VIEW_KEY = 'cbt:view-mode'

type ViewMode = 'GRID' | 'COLUMNS'
const SOURCES: Source[] = ['FED', 'ECB', 'NBP']

// ── Live UTC clock ────────────────────────────────────────────────────────
function TickingClock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const fmt = () => new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
    setTime(fmt())
    const id = setInterval(() => setTime(fmt()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="font-mono text-[11px] tabular-nums hidden md:inline" style={{ color: '#243548' }}>
      {time}
    </span>
  )
}

// ── Reusable control button ───────────────────────────────────────────────
function Btn({
  onClick, disabled = false, active = false, accentColor = '#94a3b8', title, children,
}: {
  onClick: () => void
  disabled?: boolean
  active?: boolean
  accentColor?: string
  title?: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold tracking-widest border rounded-sm font-mono transition-all duration-150"
      style={
        active
          ? { color: accentColor, backgroundColor: `${accentColor}12`, borderColor: `${accentColor}40` }
          : disabled
          ? { color: '#111e2e', borderColor: '#0d1822', cursor: 'wait' }
          : { color: '#1e3555', borderColor: '#0d1822' }
      }
    >
      {children}
    </button>
  )
}

// ── Main Terminal ─────────────────────────────────────────────────────────
export default function Terminal() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('GRID')

  // Grid-mode filter state
  const [sourceFilter, setSourceFilter] = useState<Filter>('ALL')
  const [subFilters, setSubFilters] = useState<Set<string>>(new Set())

  // Column-mode: independent sub-filters per column
  const [colSubFilters, setColSubFilters] = useState<Record<string, Set<string>>>({
    FED: new Set(), ECB: new Set(), NBP: new Set(),
  })

  const [autoRefresh, setAutoRefresh] = useState(false)
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<{ feed: string; message: string }[]>([])
  const [initialLoaded, setInitialLoaded] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Restore persisted state
  useEffect(() => {
    try {
      const raw = localStorage.getItem(READ_KEY)
      if (raw) setReadIds(new Set(JSON.parse(raw) as string[]))
    } catch {}
    try {
      const v = localStorage.getItem(VIEW_KEY) as ViewMode | null
      if (v === 'GRID' || v === 'COLUMNS') setViewMode(v)
    } catch {}
  }, [])

  const markAsRead = useCallback((id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      try { localStorage.setItem(READ_KEY, JSON.stringify([...next])) } catch {}
      return next
    })
  }, [])

  const loadFeeds = useCallback(async () => {
    setLoading(true)
    try {
      const { items: fetched, errors: errs } = await fetchAllFeeds()
      setItems(fetched)
      setErrors(errs)
      setLastUpdated(new Date())
    } catch (e) {
      setErrors([{ feed: 'ALL', message: e instanceof Error ? e.message : 'Unknown' }])
    } finally {
      setLoading(false)
      setInitialLoaded(true)
    }
  }, [])

  useEffect(() => { loadFeeds() }, [loadFeeds])

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (autoRefresh) intervalRef.current = setInterval(loadFeeds, 60_000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [autoRefresh, loadFeeds])

  function switchView(v: ViewMode) {
    setViewMode(v)
    try { localStorage.setItem(VIEW_KEY, v) } catch {}
  }

  // Grid filter handlers
  function handleSourceChange(s: Filter) { setSourceFilter(s); setSubFilters(new Set()) }
  function handleSubFilterToggle(label: string) {
    setSubFilters((prev) => { const n = new Set(prev); n.has(label) ? n.delete(label) : n.add(label); return n })
  }

  // Column sub-filter handler
  function toggleColSubFilter(source: string, label: string) {
    setColSubFilters((prev) => {
      const cur = new Set(prev[source])
      cur.has(label) ? cur.delete(label) : cur.add(label)
      return { ...prev, [source]: cur }
    })
  }

  // ── Derived data ──
  const gridFiltered = items.filter((item) => {
    if (sourceFilter !== 'ALL' && item.source !== (sourceFilter as Source)) return false
    if (sourceFilter !== 'ALL' && subFilters.size > 0 && !subFilters.has(item.feedLabel)) return false
    return true
  })

  const counts: Record<Filter, number> = {
    ALL: items.length,
    FED: items.filter((i) => i.source === 'FED').length,
    ECB: items.filter((i) => i.source === 'ECB').length,
    NBP: items.filter((i) => i.source === 'NBP').length,
  }
  const subCounts: Record<string, number> = {}
  items.forEach((item) => {
    const key = `${item.source}::${item.feedLabel}`
    subCounts[key] = (subCounts[key] ?? 0) + 1
  })

  const isColumns = viewMode === 'COLUMNS'

  return (
    <div
      className="font-mono flex flex-col"
      style={{
        backgroundColor: '#070c12',
        color: '#94a3b8',
        height: isColumns ? '100dvh' : undefined,
        minHeight: isColumns ? undefined : '100vh',
        overflow: isColumns ? 'hidden' : undefined,
      }}
    >
      {/* Scanlines */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-40"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.07) 3px, rgba(0,0,0,0.07) 4px)',
        }}
      />

      {/* ── HEADER ── */}
      <header
        className="flex-shrink-0 z-30"
        style={{
          backgroundColor: 'rgba(7,12,18,0.98)',
          borderBottom: '1px solid #0d1822',
          position: isColumns ? 'relative' : 'sticky',
          top: isColumns ? undefined : 0,
        }}
      >
        {/* Strip 1: branding + view toggle + controls */}
        <div
          className="flex items-center justify-between px-4 py-2 gap-3"
          style={{ borderBottom: '1px solid #0a1520' }}
        >
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: '#34d399', boxShadow: '0 0 6px #34d39960', animation: 'pulse 2s ease-in-out infinite' }}
              />
              <span className="text-[13px] font-bold tracking-[0.15em] uppercase" style={{ color: '#c8d8e8' }}>
                CB Terminal
              </span>
            </div>
            <div className="hidden md:flex items-center gap-1">
              {SOURCES.map((src) => (
                <span
                  key={src}
                  className="text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded-sm border"
                  style={{ color: SOURCE_COLOR[src], borderColor: `${SOURCE_COLOR[src]}22`, backgroundColor: `${SOURCE_COLOR[src]}06` }}
                >
                  {src}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <TickingClock />

            {/* ── View toggle ── */}
            <div
              className="flex items-center rounded-sm overflow-hidden"
              style={{ border: '1px solid #0d1822' }}
            >
              {([
                {
                  v: 'GRID' as ViewMode,
                  label: 'GRID',
                  title: 'Mixed grid — all sources',
                  icon: (
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor">
                      <rect x="0" y="0" width="5" height="5" rx="0.5"/>
                      <rect x="7" y="0" width="5" height="5" rx="0.5"/>
                      <rect x="0" y="7" width="5" height="5" rx="0.5"/>
                      <rect x="7" y="7" width="5" height="5" rx="0.5"/>
                    </svg>
                  ),
                },
                {
                  v: 'COLUMNS' as ViewMode,
                  label: 'COLS',
                  title: 'Column view — FED | ECB | NBP side by side',
                  icon: (
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor">
                      <rect x="0"   y="0" width="3" height="12" rx="0.5"/>
                      <rect x="4.5" y="0" width="3" height="12" rx="0.5"/>
                      <rect x="9"   y="0" width="3" height="12" rx="0.5"/>
                    </svg>
                  ),
                },
              ] as const).map(({ v, label, title, icon }) => {
                const isActive = viewMode === v
                return (
                  <button
                    key={v}
                    onClick={() => switchView(v)}
                    title={title}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold tracking-widest font-mono transition-all duration-150"
                    style={
                      isActive
                        ? { color: '#94a3b8', backgroundColor: '#0d1e35', borderRight: v === 'GRID' ? '1px solid #0d1822' : undefined }
                        : { color: '#1a2d45', backgroundColor: 'transparent', borderRight: v === 'GRID' ? '1px solid #0d1822' : undefined }
                    }
                  >
                    {icon}
                    {label}
                  </button>
                )
              })}
            </div>

            <Btn
              onClick={() => setAutoRefresh((v) => !v)}
              active={autoRefresh}
              accentColor="#34d399"
              title="Toggle auto-refresh every 60s"
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: autoRefresh ? '#34d399' : '#1e3050', animation: autoRefresh ? 'pulse 2s ease-in-out infinite' : 'none' }}
              />
              AUTO {autoRefresh ? 'ON' : 'OFF'}
            </Btn>

            <Btn
              onClick={loadFeeds}
              disabled={loading}
              title="Fetch all feeds now"
            >
              <svg
                style={{ width: 11, height: 11 }}
                className={loading ? 'animate-spin' : ''}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              >
                <path d="M21 12a9 9 0 11-6.219-8.56" />
              </svg>
              {loading ? 'SYNC…' : 'REFRESH'}
            </Btn>
          </div>
        </div>

        {/* Strip 2: filter bar — GRID only */}
        {!isColumns && (
          <div className="px-4 py-2.5">
            <FilterBar
              source={sourceFilter}
              subFilters={subFilters}
              counts={counts}
              subCounts={subCounts}
              onSourceChange={handleSourceChange}
              onSubFilterToggle={handleSubFilterToggle}
            />
          </div>
        )}

        {/* Strip 3: result count — GRID only */}
        {!isColumns && (
          <div
            className="flex items-center justify-between px-4 py-1"
            style={{ borderTop: '1px solid #0a1520', backgroundColor: '#070c12' }}
          >
            <span className="text-[10px] font-mono" style={{ color: '#1e3050' }}>
              {loading ? (
                <span style={{ color: '#38bdf860' }} className="animate-pulse">FETCHING FEEDS…</span>
              ) : (
                <>
                  <span style={{ color: sourceFilter !== 'ALL' ? SOURCE_COLOR[sourceFilter] : '#2a4060' }}>
                    {gridFiltered.length}
                  </span>
                  {' ARTICLES'}
                  {(sourceFilter !== 'ALL' || subFilters.size > 0) && (
                    <span style={{ color: '#162535' }}> · FILTERED</span>
                  )}
                </>
              )}
            </span>
            {errors.length > 0 && (
              <span
                className="text-[10px] font-mono"
                style={{ color: 'rgba(248,113,113,0.4)' }}
                title={errors.map((e) => `${e.feed}: ${e.message}`).join(' | ')}
              >
                {errors.length} FEED ERR
              </span>
            )}
          </div>
        )}
      </header>

      {/* ── COLUMN VIEW ── */}
      {isColumns && (
        <div className="flex flex-1 overflow-hidden min-h-0">
          {SOURCES.map((src, idx) => (
            <Column
              key={src}
              source={src}
              items={items.filter((i) => i.source === src)}
              subFilters={colSubFilters[src]}
              subCounts={subCounts}
              readIds={readIds}
              loading={loading}
              initialLoaded={initialLoaded}
              onRead={markAsRead}
              onSubFilterToggle={(lbl) => toggleColSubFilter(src, lbl)}
            />
          ))}
        </div>
      )}

      {/* ── GRID VIEW ── */}
      {!isColumns && (
        <main className="flex-1 p-3 pb-10">
          {!initialLoaded && loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {Array.from({ length: 16 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-sm"
                  style={{ height: i % 3 === 0 ? '9rem' : '7rem', backgroundColor: '#0b1320', border: '1px solid #111e2e' }}
                />
              ))}
            </div>
          )}

          {initialLoaded && gridFiltered.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-32 gap-3">
              <span className="text-5xl" style={{ color: '#0d1822' }}>◈</span>
              <span className="font-mono text-sm tracking-widest uppercase" style={{ color: '#1a2d45' }}>
                No articles found
              </span>
              {errors.length > 0 && (
                <ul className="mt-3 text-[11px] font-mono text-center space-y-1.5" style={{ color: 'rgba(248,113,113,0.4)' }}>
                  {errors.map((e, i) => <li key={i}>[{e.feed}] {e.message}</li>)}
                </ul>
              )}
            </div>
          )}

          {gridFiltered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {gridFiltered.map((item) => (
                <NewsCard key={item.id} item={item} read={readIds.has(item.id)} onRead={markAsRead} />
              ))}
            </div>
          )}
        </main>
      )}

      {/* ── STATUS BAR ── */}
      <StatusBar
        totalItems={items.length}
        visibleItems={isColumns ? items.length : gridFiltered.length}
        loading={loading}
        lastUpdated={lastUpdated}
        errors={errors}
        autoRefresh={autoRefresh}
      />
    </div>
  )
}
