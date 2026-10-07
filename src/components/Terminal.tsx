'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { fetchAllFeeds, NewsItem, Source } from '@/lib/rss'
import { SOURCE_COLOR } from '@/lib/feedMeta'
import NewsCard from './NewsCard'
import Column from './Column'
import DateSeparator, { dayKey } from './DateSeparator'
import FilterBar, { Filter } from './FilterBar'
import StatusBar from './StatusBar'
import SettingsDrawer from './SettingsDrawer'
import { NotifySettings, DEFAULT_NOTIFY_SETTINGS, loadNotifySettings, saveNotifySettings, notifySupported, notifyPermission, requestNotifyPermission, notifyHeadlines, testNotification } from '@/lib/notify'
import { VoiceSettings, DEFAULT_VOICE_SETTINGS, loadVoiceSettings, saveVoiceSettings, speechSupported, newHeadlines, announce, speak, stopSpeaking, voicesFor } from '@/lib/speech'

const READ_KEY     = 'cbt:read-articles'
const BOOKMARK_KEY = 'cbt:bookmarks'
const VIEW_KEY     = 'cbt:view-mode'
const THEME_KEY    = 'cbt:theme'
const ORDER_KEY    = 'cbt:source-order'

type ViewMode = 'GRID' | 'COLUMNS'
type Theme    = 'dark'  | 'light'
const DEFAULT_SOURCES: Source[] = ['FED', 'ECB', 'NBP', 'REUTERS', 'BLOOMBERG', 'STOOQ', 'AXIOS']

// ── Control button ────────────────────────────────────────────────────────
function Btn({ onClick, disabled = false, active = false, accentColor = 'var(--text-ui)', title, children }: {
  onClick: () => void; disabled?: boolean; active?: boolean
  accentColor?: string; title?: string; children: React.ReactNode
}) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className="flex items-center justify-center gap-1.5 px-3 sm:px-2.5 min-h-[40px] min-w-[40px] sm:min-h-[34px] sm:min-w-0 text-[11px] font-bold tracking-widest border rounded-sm font-mono transition-all duration-150"
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
interface TerminalProps {
  active?: boolean          // false: kept running in the background but hidden (MARKET tab shown)
  topBar?: React.ReactNode  // app bar with the MARKET / NEWS tabs, rendered as the first header strip
}

export default function Terminal({ active = true, topBar }: TerminalProps = {}) {
  const [items,          setItems]         = useState<NewsItem[]>([])
  const [viewMode,       setViewMode]      = useState<ViewMode>('GRID')
  const [theme,          setTheme]         = useState<Theme>('dark')
  const [sourceFilter,   setSourceFilter]  = useState<Filter>('ALL')
  const [subFilters,     setSubFilters]    = useState<Set<string>>(new Set())
  const [colSubFilters,  setColSubFilters] = useState<Record<string, Set<string>>>(() => Object.fromEntries(DEFAULT_SOURCES.map((s) => [s, new Set<string>()])) as Record<string, Set<string>>)
  const [sourceOrder,    setSourceOrder]    = useState<Source[]>(DEFAULT_SOURCES)
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
  const activeRef    = useRef(active)
  useEffect(() => { activeRef.current = active; if (active) { lastScrollY.current = 0; setHeaderVisible(true) } }, [active])

  // ── Voice (text-to-speech for new headlines) ──
  const [voiceOn,       setVoiceOn]       = useState(false)
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(DEFAULT_VOICE_SETTINGS)
  const [voices,        setVoices]        = useState<SpeechSynthesisVoice[]>([])
  const [canSpeak,      setCanSpeak]      = useState(false) // set after mount (no window during SSR)
  const voiceRef = useRef({ on: false, settings: DEFAULT_VOICE_SETTINGS, voices: [] as SpeechSynthesisVoice[] })
  const seenIds  = useRef<Set<string> | null>(null) // null until the first fetch: nothing is read on page load
  useEffect(() => { voiceRef.current = { on: voiceOn, settings: voiceSettings, voices } }, [voiceOn, voiceSettings, voices])
  useEffect(() => {
    setVoiceSettings(loadVoiceSettings())
    if (!speechSupported()) return
    setCanSpeak(true)
    const update = () => setVoices(window.speechSynthesis.getVoices())
    update()
    window.speechSynthesis.addEventListener('voiceschanged', update)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', update)
  }, [])
  // ── Desktop notifications (independent of voice) ──
  const [notifySettings, setNotifySettings] = useState<NotifySettings>(DEFAULT_NOTIFY_SETTINGS)
  const [notifyPerm,     setNotifyPerm]     = useState<NotificationPermission | 'unsupported'>('unsupported')
  const notifyRef = useRef(DEFAULT_NOTIFY_SETTINGS)
  useEffect(() => { notifyRef.current = notifySettings }, [notifySettings])
  useEffect(() => {
    const v = loadNotifySettings(), perm = notifyPermission()
    setNotifySettings(v); setNotifyPerm(perm)
    if (v.enabled && perm === 'granted') setAutoRefresh(true) // keep checking for news after a reload
  }, [])
  function changeNotifySettings(v: NotifySettings) { setNotifySettings(v); saveNotifySettings(v) }
  async function toggleNotify() {
    if (notifySettings.enabled) { changeNotifySettings({ ...notifySettings, enabled: false }); return }
    const perm = await requestNotifyPermission()
    setNotifyPerm(perm)
    if (perm !== 'granted') return
    changeNotifySettings({ ...notifySettings, enabled: true })
    setAutoRefresh(true)
    testNotification()
  }

  function changeVoiceSettings(v: VoiceSettings) { setVoiceSettings(v); saveVoiceSettings(v) }
  function toggleVoice() {
    if (voiceOn) { stopSpeaking(); setVoiceOn(false); return }
    setVoiceOn(true)
    setAutoRefresh(true) // voice only makes sense with auto-refresh
    // Speaking inside the click also unlocks speech in browsers that require a user gesture
    const pl = voicesFor(voices, 'pl').length > 0
    speak(pl ? 'Głos włączony.' : 'Voice on.', pl ? 'pl' : 'en', voiceSettings, voices)
  }

  // Restore persisted state
  useEffect(() => {
    try { const r = localStorage.getItem(READ_KEY);     if (r) setReadIds(new Set(JSON.parse(r)))      } catch {}
    try { const b = localStorage.getItem(BOOKMARK_KEY); if (b) setBookmarkIds(new Set(JSON.parse(b)))  } catch {}
    try { const v = localStorage.getItem(VIEW_KEY)  as ViewMode | null; if (v === 'GRID' || v === 'COLUMNS') setViewMode(v) } catch {}
    try { const t = localStorage.getItem(THEME_KEY) as Theme   | null; if (t === 'dark' || t === 'light')   setTheme(t)    } catch {}
    try {
      const o = localStorage.getItem(ORDER_KEY)
      if (o) {
        const parsed = JSON.parse(o) as Source[]
        // Validate: must contain all sources
        if (parsed.length === DEFAULT_SOURCES.length && DEFAULT_SOURCES.every((s) => parsed.includes(s))) setSourceOrder(parsed)
      }
    } catch {}
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
      const seen = seenIds.current
      const v = voiceRef.current
      if (seen && v.on) {
        const fresh = newHeadlines(fetched, seen, v.settings.sources)
        if (fresh.length) announce(fresh, v.settings, v.voices)
      }
      const n = notifyRef.current
      if (seen && n.enabled) notifyHeadlines(newHeadlines(fetched, seen, n.sources))
      seenIds.current = new Set([...(seen ?? []), ...fetched.map((i) => i.id)])
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
  function clearAll()       { clearRead(); clearBookmarks(); setSourceOrder(DEFAULT_SOURCES); try { localStorage.removeItem(VIEW_KEY); localStorage.removeItem(THEME_KEY); localStorage.removeItem(ORDER_KEY) } catch {} }
  function changeSourceOrder(order: Source[]) { setSourceOrder(order); try { localStorage.setItem(ORDER_KEY, JSON.stringify(order)) } catch {} }

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
    if (viewMode === 'COLUMNS') return
    const threshold = 10
    function onScroll() {
      if (!activeRef.current) return
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
      if (!activeRef.current) return
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
    AXIOS:     items.filter((i) => i.source === 'AXIOS').length,
    SAVED:     bookmarkIds.size,
  }
  const subCounts: Record<string, number> = {}
  items.forEach((i) => { const k = `${i.source}::${i.feedLabel}`; subCounts[k] = (subCounts[k] ?? 0) + 1 })

  const isColumns = viewMode === 'COLUMNS'
  const isDark    = theme === 'dark'

  const updStr = lastUpdated ? lastUpdated.toISOString().slice(11, 19) : '—'
  const actions = (
    <>
      <span className="hidden lg:inline font-mono text-[12px] tabular-nums mr-1" style={{ color: 'var(--text-ui)' }}
        title="Last feed update (UTC)">
        UPD {loading ? '…' : updStr}
      </span>

      {/* AUTO refresh — icon-only dot on mobile, labelled on desktop */}
      <Btn onClick={() => setAutoRefresh((v) => !v)} active={autoRefresh} accentColor="#34d399"
        title={autoRefresh ? 'Auto-refresh ON (60s) — click to turn off' : 'Auto-refresh OFF — click to turn on (60s)'}>
        <span className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: autoRefresh ? '#34d399' : 'var(--text-ui)', opacity: autoRefresh ? 1 : 0.55, animation: autoRefresh ? 'pulse 2s ease-in-out infinite' : 'none' }} />
        <span className="hidden sm:inline">AUTO</span>
      </Btn>

      {/* Desktop notifications (desktop browsers; phones need a service worker) */}
      {notifyPerm !== 'unsupported' && (
        <span className="hidden sm:flex">
          <Btn onClick={toggleNotify} active={notifySettings.enabled} accentColor="#38bdf8"
            title={notifySettings.enabled ? 'Desktop notifications ON — click to turn off'
              : notifyPerm === 'denied' ? 'Notifications are blocked for this site — allow them in the browser site settings'
              : 'Desktop notifications OFF — click to turn on (turns on AUTO)'}>
            <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
              {!notifySettings.enabled && <path d="M2 2l20 20"/>}
            </svg>
            <span className="hidden lg:inline">NOTIFY</span>
          </Btn>
        </span>
      )}

      {/* Voice: read new headlines aloud */}
      {canSpeak && (
        <Btn onClick={toggleVoice} active={voiceOn} accentColor="#f59e0b"
          title={voiceOn ? 'Voice ON — new headlines are read aloud. Click to turn off' : 'Voice OFF — click to read new headlines aloud (turns on AUTO)'}>
          <svg style={{ width: 14, height: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5L6 9H2v6h4l5 4V5z"/>
            {voiceOn ? <><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/></> : <path d="M23 9l-6 6M17 9l6 6"/>}
          </svg>
          <span className="hidden md:inline">VOICE</span>
        </Btn>
      )}

      {/* Search + Refresh — on mobile they live in the bottom bar */}
      <span className="hidden sm:flex">
        <Btn onClick={() => { setSearchOpen((v) => { if (!v) setTimeout(() => searchRef.current?.focus(), 100); return !v }); if (searchOpen) setSearchQuery('') }}
          active={searchOpen || !!q} accentColor="var(--src-ECB)" title="Search (Ctrl+K)">
          <svg style={{ width: 13, height: 13 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <span className="hidden md:inline">SEARCH</span>
        </Btn>
      </span>
      <span className="hidden sm:flex">
        <Btn onClick={loadFeeds} disabled={loading} title="Fetch now">
          <svg style={{ width: 13, height: 13 }} className={loading ? 'animate-spin' : ''} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 12a9 9 0 11-6.219-8.56" />
          </svg>
          <span className="hidden md:inline">{loading ? 'SYNC…' : 'REFRESH'}</span>
        </Btn>
      </span>

      {/* Settings gear (theme, saved, view mode and the rest live in the drawer) */}
      <button onClick={() => setSettingsOpen(true)} title="Settings"
        className="flex items-center justify-center min-h-[40px] min-w-[40px] sm:min-h-[34px] sm:min-w-[34px] border rounded-sm transition-all duration-150"
        style={{ color: 'var(--text-ui)', borderColor: 'var(--border)' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/>
        </svg>
      </button>
    </>
  )

  return (
    <div
      data-theme={theme}
      className="font-mono flex flex-col"
      style={{
        backgroundColor: 'var(--bg)', color: 'var(--text-hi)',
        height: isColumns ? '100dvh' : undefined,
        minHeight: isColumns ? undefined : '100dvh',
        overflow: isColumns ? 'hidden' : undefined,
        display: active ? undefined : 'none',
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
        onScrollToTop={scrollToTop}
        onSearch={() => { scrollToTop(); setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 100) }}
        onRefresh={loadFeeds}
        loading={loading}
        sourceOrder={sourceOrder}
        onSourceOrderChange={changeSourceOrder}
        items={items}
        voiceOn={voiceOn}
        onVoiceToggle={toggleVoice}
        voiceSettings={voiceSettings}
        onVoiceSettingsChange={changeVoiceSettings}
        voices={voices}
        notifySettings={notifySettings}
        notifyPerm={notifyPerm}
        onNotifyToggle={toggleNotify}
        onNotifySettingsChange={changeNotifySettings}
        onNotifyTest={testNotification}
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
        {topBar}

        {/* One row: source filters on the left, actions on the right */}
        {!isColumns ? (
          <div className="px-3 sm:px-4 lg:px-6 py-2">
            <FilterBar source={sourceFilter} subFilters={subFilters} counts={counts} subCounts={subCounts}
              onSourceChange={handleSourceChange} onSubFilterToggle={handleSubFilterToggle} sourceOrder={sourceOrder}
              actions={actions} />
          </div>
        ) : (
          <div className="flex items-center justify-end gap-1.5 px-3 sm:px-4 lg:px-6 py-2" style={{ borderBottom: '1px solid var(--border-dim)' }}>
            {actions}
          </div>
        )}

        {/* Strip: Search bar — renders in header for all views */}
        {searchOpen && (
          <div className="flex items-center gap-2 px-3 sm:px-4 lg:px-6 py-2"
            style={{ borderBottom: '1px solid var(--border-dim)' }}>
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
              <span className="font-mono text-[12px] shrink-0" style={{ color: items.filter((i) => matchesSearch(i, q)).length > 0 ? 'var(--src-NBP)' : 'var(--src-FED-fomc)' }}>
                {items.filter((i) => matchesSearch(i, q)).length} hits
              </span>
            )}
            <button onClick={() => { setSearchQuery(''); setSearchOpen(false) }}
              className="font-mono text-[11px] shrink-0"
              style={{ color: 'var(--text-ui)' }}>
              ✕
            </button>
          </div>
        )}

        {/* Strip 4: COLUMNS mobile tab switcher */}
        {isColumns && (
          <div className="flex md:hidden" style={{ borderBottom: '1px solid var(--border)' }}>
            {sourceOrder.map((src) => {
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
                  <span style={{ opacity: 0.6, fontSize: '12px' }}>{counts[src]}</span>
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
        <div className="flex flex-1 overflow-x-auto overflow-y-hidden min-h-0 columns-scroll">
          {sourceOrder.map((src) => (
            /* Mobile: show only active column. Desktop: equal flex columns */
            <div key={src} className={`${mobileActiveCol === src ? 'flex' : 'hidden'} md:flex shrink-0 md:shrink md:flex-1 overflow-hidden`}
              style={{ width: 'min(100vw, 280px)', minWidth: '240px' }}>
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
        <main className="flex-1 p-2 sm:p-3 lg:p-4 pb-24 mx-auto w-full max-w-[2400px]">
          {!initialLoaded && loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[2200px]:grid-cols-6 gap-2 lg:gap-3">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[2200px]:grid-cols-6 gap-2 lg:gap-3">
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

      {/* ── BOTTOM NAV BAR (glossy, hides on scroll) ── */}
      {!isColumns && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300"
          style={{ transform: headerVisible ? 'translateY(0)' : 'translateY(100%)' }}>

          {/* Nav buttons */}
          <nav
            className="flex items-center justify-around"
            style={{
              backgroundColor: isDark ? 'rgba(7,12,18,0.92)' : 'rgba(238,242,247,0.92)',
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
