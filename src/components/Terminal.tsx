'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { fetchAllFeeds, NewsItem, Source } from '@/lib/rss'
import { SOURCE_COLOR, SOURCE_BG, SOURCE_BD } from '@/lib/feedMeta'
import NewsCard from './NewsCard'
import Column from './Column'
import DateSeparator, { dayKey } from './DateSeparator'
import FilterBar, { Filter } from './FilterBar'
import StatusBar from './StatusBar'
import SettingsDrawer from './SettingsDrawer'

const READ_KEY     = 'cbt:read-articles'
const BOOKMARK_KEY = 'cbt:bookmarks'
const VIEW_KEY     = 'cbt:view-mode'
const THEME_KEY    = 'cbt:theme'

type ViewMode = 'GRID' | 'COLUMNS'
type Theme    = 'dark'  | 'light'
const SOURCES: Source[] = ['FED', 'ECB', 'NBP', 'REUTERS', 'BLOOMBERG', 'STOOQ']

// ── Ticking clock ─────────────────────────────────────────────────────────
function TickingClock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const fmt = () => new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
    setTime(fmt()); const id = setInterval(() => setTime(fmt()), 1000)
    return () => clearInterval(id)
  }, [])
  return <span className="font-mono text-[11px] tabular-nums hidden lg:inline" style={{ color: 'var(--text-ui)' }}>{time}</span>
}

// ── Control button ────────────────────────────────────────────────────────
function Btn({ onClick, disabled = false, active = false, accentColor = 'var(--text-ui)', title, children }: {
  onClick: () => void; disabled?: boolean; active?: boolean
  accentColor?: string; title?: string; children: React.ReactNode
}) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold tracking-widest border rounded-sm font-mono transition-all duration-150"
      style={
        active
          ? { color: accentColor, backgroundColor: `${accentColor}15`, borderColor: `${accentColor}45` }
          : disabled
          ? { color: 'var(--text-dim)', borderColor: 'var(--border)', cursor: 'wait' }
          : { color: 'var(--text-ui)', borderColor: 'var(--border)' }
      }
    >{children}</button>
  )
}

// ── Main Terminal ─────────────────────────────────────────────────────────
export default function Terminal() {
  const [items,          setItems]         = useState<NewsItem[]>([])
  const [viewMode,       setViewMode]      = useState<ViewMode>('GRID')
  const [theme,          setTheme]         = useState<Theme>('dark')
  const [sourceFilter,   setSourceFilter]  = useState<Filter>('ALL')
  const [subFilters,     setSubFilters]    = useState<Set<string>>(new Set())
  const [colSubFilters,  setColSubFilters] = useState<Record<string, Set<string>>>({ FED: new Set(), ECB: new Set(), NBP: new Set(), REUTERS: new Set(), BLOOMBERG: new Set(), STOOQ: new Set() })
  const [mobileActiveCol,setMobileActiveCol] = useState<Source>('FED')
  const [autoRefresh,    setAutoRefresh]   = useState(false)
  const [loading,        setLoading]       = useState(false)
  const [lastUpdated,    setLastUpdated]   = useState<Date | null>(null)
  const [readIds,        setReadIds]       = useState<Set<string>>(new Set())
  const [bookmarkIds,    setBookmarkIds]   = useState<Set<string>>(new Set())
  const [errors,         setErrors]        = useState<{ feed: string; message: string }[]>([])
  const [initialLoaded,  setInitialLoaded] = useState(false)
  const [settingsOpen,   setSettingsOpen]  = useState(false)
  const [searchQuery,    setSearchQuery]   = useState('')
  const [searchOpen,     setSearchOpen]    = useState(false)
  const [headerVisible,  setHeaderVisible] = useState(true)
  const [headerHeight,   setHeaderHeight]  = useState(0)
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const searchRef    = useRef<HTMLInputElement>(null)
  const lastScrollY  = useRef(0)
  const feedRef      = useRef<HTMLDivElement>(null)
  const headerRef    = useRef<HTMLElement>(null)

  // Restore persisted state
  useEffect(() => {
    try { const r = localStorage.getItem(READ_KEY);     if (r) setReadIds(new Set(JSON.parse(r)))      } catch {}
    try { const b = localStorage.getItem(BOOKMARK_KEY); if (b) setBookmarkIds(new Set(JSON.parse(b)))  } catch {}
    try { const v = localStorage.getItem(VIEW_KEY)  as ViewMode | null; if (v === 'GRID' || v === 'COLUMNS') setViewMode(v) } catch {}
    try { const t = localStorage.getItem(THEME_KEY) as Theme   | null; if (t === 'dark' || t === 'light')   setTheme(t)    } catch {}
  }, [])

  // Read tracker
  const markAsRead = useCallback((id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev); next.add(id)
      try { localStorage.setItem(READ_KEY, JSON.stringify([...next])) } catch {}
      return next
    })
  }, [])

  // Bookmark tracker
  const toggleBookmark = useCallback((id: string) => {
    setBookmarkIds((prev) => {
      const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id)
      try { localStorage.setItem(BOOKMARK_KEY, JSON.stringify([...next])) } catch {}
      return next
    })
  }, [])

  // Feed loader
  const loadFeeds = useCallback(async () => {
    setLoading(true)
    try {
      const { items: fetched, errors: errs } = await fetchAllFeeds()
      setItems(fetched); setErrors(errs); setLastUpdated(new Date())
    } catch (e) {
      setErrors([{ feed: 'ALL', message: e instanceof Error ? e.message : 'Unknown' }])
    } finally { setLoading(false); setInitialLoaded(true) }
  }, [])

  useEffect(() => { loadFeeds() }, [loadFeeds])
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (autoRefresh) intervalRef.current = setInterval(loadFeeds, 60_000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [autoRefresh, loadFeeds])

  function switchView(v: ViewMode) { setViewMode(v); try { localStorage.setItem(VIEW_KEY, v) } catch {} }
  function switchTheme() {
    setTheme((t) => { const n = t === 'dark' ? 'light' : 'dark'; try { localStorage.setItem(THEME_KEY, n) } catch {}; return n })
  }

  function handleSourceChange(s: Filter) { setSourceFilter(s); setSubFilters(new Set()); scrollToTop() }
  function handleSubFilterToggle(label: string) {
    setSubFilters((p) => { const n = new Set(p); n.has(label) ? n.delete(label) : n.add(label); return n })
  }
  function toggleColSubFilter(source: string, label: string) {
    setColSubFilters((p) => { const cur = new Set(p[source]); cur.has(label) ? cur.delete(label) : cur.add(label); return { ...p, [source]: cur } })
  }

  // Settings: clear actions
  function clearRead()      { setReadIds(new Set());      try { localStorage.removeItem(READ_KEY)     } catch {} }
  function clearBookmarks() { setBookmarkIds(new Set()); try { localStorage.removeItem(BOOKMARK_KEY)  } catch {} }
  function clearAll()       { clearRead(); clearBookmarks(); try { localStorage.removeItem(VIEW_KEY); localStorage.removeItem(THEME_KEY) } catch {} }

  // ── Measure header height for spacer ──
  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setHeaderHeight(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── Twitter/X-like scroll: hide header on scroll down, show on scroll up ──
  useEffect(() => {
    if (viewMode === 'COLUMNS') return // columns view doesn't scroll the page
    const threshold = 10
    function onScroll() {
      const y = window.scrollY
      if (y < 60) { setHeaderVisible(true); lastScrollY.current = y; return }
      if (y - lastScrollY.current > threshold) setHeaderVisible(false)
      else if (lastScrollY.current - y > threshold) setHeaderVisible(true)
      lastScrollY.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [viewMode])

  // ── Scroll to top helper ──
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    lastScrollY.current = 0
    setHeaderVisible(true)
  }, [])

  // Focus search on Ctrl+K or /  (when not typing in another input)
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); scrollToTop(); setTimeout(() => searchRef.current?.focus(), 100) }
      if (e.key === '/') { e.preventDefault(); setSearchOpen(true); scrollToTop(); setTimeout(() => searchRef.current?.focus(), 100) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ── Search helper ──
  function matchesSearch(item: NewsItem, q: string): boolean {
    if (!q) return true
    const lq = q.toLowerCase()
    return item.title.toLowerCase().includes(lq) || item.source.toLowerCase().includes(lq) || item.feedLabel.toLowerCase().includes(lq)
  }

  // ── Derived data ──
  const q = searchQuery.trim()

  const gridFiltered = (() => {
    if (sourceFilter === 'SAVED') return items.filter((i) => bookmarkIds.has(i.id) && matchesSearch(i, q))
    return items.filter((item) => {
      if (sourceFilter !== 'ALL' && item.source !== (sourceFilter as Source)) return false
      if (sourceFilter !== 'ALL' && subFilters.size > 0 && !subFilters.has(item.feedLabel)) return false
      return matchesSearch(item, q)
    })
  })()

  const counts: Record<Filter, number> = {
    ALL:   items.length,
    FED:   items.filter((i) => i.source === 'FED').length,
    ECB:   items.filter((i) => i.source === 'ECB').length,
    NBP:     items.filter((i) => i.source === 'NBP').length,
    REUTERS:   items.filter((i) => i.source === 'REUTERS').length,
    BLOOMBERG: items.filter((i) => i.source === 'BLOOMBERG').length,
    STOOQ:     items.filter((i) => i.source === 'STOOQ').length,
    SAVED:     bookmarkIds.size,
  }
  const subCounts: Record<string, number> = {}
  items.forEach((i) => { const k = `${i.source}::${i.feedLabel}`; subCounts[k] = (subCounts[k] ?? 0) + 1 })

  const isColumns = viewMode === 'COLUMNS'
  const isDark    = theme === 'dark'

  return (
    <div
      data-theme={theme}
      className="font-mono flex flex-col"
      style={{
        backgroundColor: 'var(--bg)', color: 'var(--text-hi)',
        height: isColumns ? '100dvh' : undefined,
        minHeight: isColumns ? undefined : '100dvh',
        overflow: isColumns ? 'hidden' : undefined,
      }}
    >
      {/* Subtle vignette — dark only, no scanlines */}
      {isDark && <div aria-hidden className="pointer-events-none fixed inset-0 z-40"
        style={{ background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.35) 100%)' }} />}

      {/* ── SETTINGS DRAWER ── */}
      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        readCount={readIds.size}
        bookmarkCount={bookmarkIds.size}
        theme={theme}
        autoRefresh={autoRefresh}
        onClearRead={clearRead}
        onClearBookmarks={clearBookmarks}
        onClearAll={clearAll}
        onThemeToggle={switchTheme}
        onAutoRefreshToggle={() => setAutoRefresh((v) => !v)}
        viewMode={viewMode}
        onViewModeChange={switchView}
        onShowSaved={() => { if (viewMode !== 'GRID') switchView('GRID'); handleSourceChange('SAVED'); setSettingsOpen(false) }}
      />

      {/* ── HEADER ── */}
      <header ref={headerRef} className="flex-shrink-0 z-30 transition-transform duration-300"
        style={{
          backgroundColor: 'var(--header-bg)', backdropFilter: 'blur(8px)',
          borderBottom: '1px solid var(--border)',
          position: isColumns ? 'relative' : 'fixed', top: 0, left: 0, right: 0,
          transform: (!isColumns && !headerVisible) ? 'translateY(-100%)' : 'translateY(0)',
        }}
      >
        {/* Strip 1: branding + controls */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 gap-2" style={{ borderBottom: '1px solid var(--border-dim)' }}>
          {/* Logo */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: '#34d399', boxShadow: '0 0 6px #34d39960', animation: 'pulse 2s ease-in-out infinite' }} />
            <span className="text-[12px] sm:text-[13px] font-bold tracking-[0.12em] uppercase whitespace-nowrap" style={{ color: 'var(--text-hi)' }}>
              CB Terminal
            </span>
            <div className="hidden md:flex items-center gap-1 ml-1">
              {SOURCES.map((src) => (
                <span key={src} className="text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded-sm border"
                  style={{ color: SOURCE_COLOR[src], borderColor: SOURCE_BD[src], backgroundColor: SOURCE_BG[src] }}>
                  {src}
                </span>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <TickingClock />

            {/* Theme toggle — hidden on mobile, in drawer */}
            <button onClick={switchTheme} title={isDark ? 'Light mode' : 'Dark mode'}
              className="hidden sm:flex px-2 py-1.5 text-[12px] border rounded-sm font-mono transition-all duration-150"
              style={{ color: 'var(--text-ui)', borderColor: 'var(--border)' }}>
              {isDark ? '☀' : '☾'}
            </button>

            {/* AUTO refresh — hidden on mobile, in drawer */}
            <span className="hidden sm:flex">
              <Btn onClick={() => setAutoRefresh((v) => !v)} active={autoRefresh} accentColor="#34d399" title="Toggle auto-refresh 60s">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: autoRefresh ? '#34d399' : 'var(--text-dim)', animation: autoRefresh ? 'pulse 2s ease-in-out infinite' : 'none' }} />
                <span className="hidden sm:inline">AUTO</span>
              </Btn>
            </span>

            {/* Refresh */}
            <Btn onClick={loadFeeds} disabled={loading} title="Fetch now">
              <svg style={{ width: 11, height: 11 }} className={loading ? 'animate-spin' : ''} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 12a9 9 0 11-6.219-8.56" />
              </svg>
              <span className="hidden sm:inline">{loading ? 'SYNC…' : 'REFRESH'}</span>
            </Btn>

            {/* Bookmarks — hidden on mobile, accessible from drawer */}
            <span className="hidden sm:flex">
              <Btn onClick={() => { if (viewMode !== 'GRID') switchView('GRID'); handleSourceChange('SAVED') }}
                active={sourceFilter === 'SAVED'} accentColor="#f59e0b" title="Saved bookmarks">
                ★
                <span className="hidden sm:inline">SAVED</span>
                {bookmarkIds.size > 0 && <span className="tabular-nums" style={{ fontSize: '10px', opacity: 0.75 }}>{bookmarkIds.size}</span>}
              </Btn>
            </span>

            {/* Settings gear */}
            <button onClick={() => setSettingsOpen(true)} title="Settings"
              className="flex items-center px-2 py-1.5 border rounded-sm transition-all duration-150"
              style={{ color: 'var(--text-ui)', borderColor: 'var(--border)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Strip 2: GRID filters */}
        {!isColumns && (
          <div className="px-3 sm:px-4 py-2.5">
            <FilterBar source={sourceFilter} subFilters={subFilters} counts={counts} subCounts={subCounts}
              onSourceChange={handleSourceChange} onSubFilterToggle={handleSubFilterToggle} />
          </div>
        )}

        {/* Strip 4: COLUMNS mobile tab switcher */}
        {isColumns && (
          <div className="flex md:hidden" style={{ borderBottom: '1px solid var(--border)' }}>
            {SOURCES.map((src) => {
              const isActive = mobileActiveCol === src
              const color = SOURCE_COLOR[src]
              return (
                <button key={src} onClick={() => setMobileActiveCol(src)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold tracking-widest font-mono transition-all duration-150"
                  style={
                    isActive
                      ? { color, backgroundColor: `${color}10`, borderBottom: `2px solid ${color}` }
                      : { color, opacity: 0.45, borderBottom: '2px solid transparent' }
                  }
                >
                  {src}
                  <span style={{ opacity: 0.6, fontSize: '10px' }}>{counts[src]}</span>
                </button>
              )
            })}
          </div>
        )}

      </header>

      {/* Spacer for fixed header in GRID view */}
      {!isColumns && <div style={{ height: headerHeight }} />}

      {/* ── COLUMN VIEW ── */}
      {isColumns && (
        <div className="flex flex-1 overflow-x-auto overflow-y-hidden min-h-0 no-scrollbar">
          {SOURCES.map((src) => (
            /* Mobile: show only active column. Desktop: min-width per column, horizontally scrollable */
            <div key={src} className={`${mobileActiveCol === src ? 'flex' : 'hidden'} md:flex shrink-0 overflow-hidden`}
              style={{ width: 'min(280px, 100vw)', minWidth: '200px' }}>
              <Column
                source={src}
                items={items.filter((i) => i.source === src)}
                subFilters={colSubFilters[src]}
                subCounts={subCounts}
                readIds={readIds}
                bookmarkIds={bookmarkIds}
                loading={loading}
                initialLoaded={initialLoaded}
                onRead={markAsRead}
                onBookmark={toggleBookmark}
                onSubFilterToggle={(lbl) => toggleColSubFilter(src, lbl)}
                searchQuery={q}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── GRID VIEW ── */}
      {!isColumns && (
        <main className="flex-1 p-2 sm:p-3 pb-24">
          {!initialLoaded && loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-sm"
                  style={{ height: i % 3 === 0 ? '9rem' : '7rem', backgroundColor: 'var(--skeleton)', border: '1px solid var(--border)' }} />
              ))}
            </div>
          )}

          {initialLoaded && gridFiltered.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-32 gap-3">
              <span className="text-5xl" style={{ color: 'var(--border)' }}>
                {sourceFilter === 'SAVED' ? '★' : '◈'}
              </span>
              <span className="font-mono text-sm tracking-widest uppercase" style={{ color: 'var(--text-dim)' }}>
                {sourceFilter === 'SAVED' ? 'No bookmarks yet' : 'No articles found'}
              </span>
              {errors.length > 0 && (
                <ul className="mt-3 text-[11px] font-mono text-center space-y-1.5" style={{ color: 'rgba(248,113,113,0.6)' }}>
                  {errors.map((e, i) => <li key={i}>[{e.feed}] {e.message}</li>)}
                </ul>
              )}
            </div>
          )}

          {gridFiltered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {gridFiltered.map((item, i) => {
                const dk = dayKey(item.pubDate)
                const prev = i > 0 ? dayKey(gridFiltered[i - 1].pubDate) : null
                const showSep = dk !== prev
                return (
                  <>{showSep && <DateSeparator key={`sep-${dk}`} date={item.pubDate} span />}
                  <NewsCard key={item.id} item={item}
                    read={readIds.has(item.id)}
                    bookmarked={bookmarkIds.has(item.id)}
                    onRead={markAsRead}
                    onBookmark={toggleBookmark}
                  /></>
                )
              })}
            </div>
          )}
        </main>
      )}

      {/* ── BOTTOM NAV BAR (Twitter/X style) ── */}
      {!isColumns && (
        <div className="fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300"
          style={{ transform: headerVisible ? 'translateY(0)' : 'translateY(100%)' }}>

          {/* Search bar — slides up above nav when open */}
          {searchOpen && (
            <div className="flex items-center gap-2 px-3 py-2"
              style={{
                backgroundColor: isDark ? 'rgba(7,12,18,0.55)' : 'rgba(238,242,247,0.55)',
                backdropFilter: 'saturate(180%) blur(16px)', WebkitBackdropFilter: 'saturate(180%) blur(16px)',
                borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border-dim)',
              }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                style={{ color: q ? 'var(--src-ECB)' : 'var(--text-ui)', flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') { setSearchQuery(''); setSearchOpen(false) } }}
                placeholder="SEARCH…"
                className="flex-1 bg-transparent font-mono text-[12px] outline-none min-w-0"
                style={{ color: 'var(--text-hi)', caretColor: 'var(--src-NBP)' }}
                spellCheck={false}
                autoComplete="off"
                autoFocus
              />
              {q && (
                <span className="font-mono text-[10px] shrink-0" style={{ color: gridFiltered.length > 0 ? 'var(--src-NBP)' : 'var(--src-FED-fomc)' }}>
                  {isColumns
                    ? `${items.filter((i) => matchesSearch(i, q)).length} hits`
                    : `${gridFiltered.length} hits`}
                </span>
              )}
              <button onClick={() => { setSearchQuery(''); setSearchOpen(false) }}
                className="font-mono text-[11px] shrink-0"
                style={{ color: 'var(--text-ui)' }}>
                ✕
              </button>
            </div>
          )}

          {/* Nav buttons */}
          <nav
            className="flex items-center justify-around"
            style={{
              backgroundColor: isDark ? 'rgba(7,12,18,0.5)' : 'rgba(238,242,247,0.5)',
              backdropFilter: 'saturate(180%) blur(16px)', WebkitBackdropFilter: 'saturate(180%) blur(16px)',
              borderTop: '1px solid var(--border)',
              height: 'calc(48px + env(safe-area-inset-bottom, 0px))',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            {/* Home — scroll to top */}
            <button onClick={scrollToTop} title="Home"
              className="flex flex-col items-center justify-center gap-0.5 py-2 px-5 transition-colors"
              style={{ color: 'var(--text-ui)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </button>

            {/* Search toggle */}
            <button onClick={() => { setSearchOpen((v) => { if (!v) { scrollToTop(); setTimeout(() => searchRef.current?.focus(), 100) }; return !v }); if (searchOpen) setSearchQuery('') }} title="Search"
              className="flex flex-col items-center justify-center gap-0.5 py-2 px-5 transition-colors"
              style={{ color: (searchOpen || q) ? 'var(--src-ECB)' : 'var(--text-ui)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
            </button>

            {/* Refresh */}
            <button onClick={loadFeeds} disabled={loading} title="Refresh"
              className="flex flex-col items-center justify-center gap-0.5 py-2 px-5 transition-colors"
              style={{ color: loading ? 'var(--text-dim)' : 'var(--text-ui)' }}>
              <svg width="20" height="20" className={loading ? 'animate-spin' : ''} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 11-6.219-8.56" />
              </svg>
            </button>

            {/* Settings */}
            <button onClick={() => setSettingsOpen(true)} title="Settings"
              className="flex flex-col items-center justify-center gap-0.5 py-2 px-5 transition-colors"
              style={{ color: 'var(--text-ui)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/>
              </svg>
            </button>
          </nav>
        </div>
      )}

      <StatusBar
        totalItems={items.length}
        visibleItems={isColumns ? items.length : gridFiltered.length}
        loading={loading} lastUpdated={lastUpdated}
        errors={errors} autoRefresh={autoRefresh}
        hidden={!isColumns}
      />
    </div>
  )
}
