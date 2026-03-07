'use client'

import { NewsItem } from '@/lib/rss'
import { FEED_META, SOURCE_COLOR, SOURCE_SUBFEEDS } from '@/lib/feedMeta'
import NewsCard from './NewsCard'

interface Props {
  source: 'FED' | 'ECB' | 'NBP'
  items: NewsItem[]
  subFilters: Set<string>
  subCounts: Record<string, number>
  readIds: Set<string>
  bookmarkIds: Set<string>
  loading: boolean
  initialLoaded: boolean
  onRead: (id: string) => void
  onBookmark: (id: string) => void
  onSubFilterToggle: (label: string) => void
}

const SOURCE_FULL: Record<string, string> = {
  FED: 'Federal Reserve',
  ECB: 'European Central Bank',
  NBP: 'Narodowy Bank Polski',
}

export default function Column({
  source, items, subFilters, subCounts, readIds, bookmarkIds,
  loading, initialLoaded, onRead, onBookmark, onSubFilterToggle,
}: Props) {
  const color    = SOURCE_COLOR[source]
  const subfeeds = SOURCE_SUBFEEDS[source] ?? []

  const visible = subFilters.size > 0
    ? items.filter((i) => subFilters.has(i.feedLabel))
    : items

  function clearFilters() { subFilters.forEach((l) => onSubFilterToggle(l)) }

  return (
    <div className="flex flex-col flex-1 min-w-0 overflow-hidden" style={{ borderRight: '1px solid var(--border)' }}>

      {/* ── Column header (fixed structure so all columns are same height) ── */}
      <div className="flex-shrink-0" style={{ backgroundColor: 'var(--bg)', borderBottom: `2px solid ${color}35` }}>

        {/* Title row */}
        <div className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: '1px solid var(--border-dim)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}70` }} />
            <div className="flex flex-col leading-none gap-0.5">
              <span className="text-[13px] font-bold tracking-[0.12em] uppercase" style={{ color }}>
                {source}
              </span>
              <span className="text-[9px] font-mono" style={{ color: 'var(--text-ui)' }}>
                {SOURCE_FULL[source]}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {loading && <span className="text-[9px] font-mono animate-pulse" style={{ color: `${color}80` }}>SYNC</span>}
            <span className="text-[12px] font-mono tabular-nums font-bold" style={{ color: `${color}90` }}>{visible.length}</span>
          </div>
        </div>

        {/* Sub-feed chip row — ALWAYS rendered for uniform height.
            FED/ECB show chips; NBP shows just the label placeholder */}
        <div className="flex items-center gap-1 px-3 flex-wrap" style={{ minHeight: '2.25rem', paddingTop: '0.375rem', paddingBottom: '0.375rem' }}>
          {subfeeds.length > 1 ? (
            <>
              {subfeeds.map((lbl) => {
                const meta  = FEED_META[`${source}::${lbl}`]
                if (!meta) return null
                const count = subCounts[`${source}::${lbl}`] ?? 0
                const isOn  = subFilters.has(lbl)
                return (
                  <button
                    key={lbl}
                    onClick={() => onSubFilterToggle(lbl)}
                    className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold tracking-wider border rounded-sm font-mono transition-all duration-100"
                    style={
                      isOn
                        ? { color: meta.color, backgroundColor: meta.bg, borderColor: `${meta.color}45` }
                        : { color: `${meta.color}80`, borderColor: `${meta.color}25`, backgroundColor: 'transparent' }
                    }
                  >
                    <span style={{ fontSize: 8 }}>{meta.symbol}</span>
                    {lbl}
                    <span style={{ opacity: 0.55 }}>{count}</span>
                  </button>
                )
              })}
              {subFilters.size > 0 && (
                <button onClick={clearFilters} className="px-1.5 py-0.5 text-[9px] font-mono border rounded-sm"
                  style={{ color: 'var(--text-ui)', borderColor: 'var(--border)' }}>✕</button>
              )}
            </>
          ) : (
            /* Placeholder to keep row height uniform for sources with single sub-feed */
            <span className="text-[9px] font-mono" style={{ color: 'var(--text-dim)' }}>
              {subfeeds[0] ?? '—'}
            </span>
          )}
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: `${color}30 transparent` }}>
        {!initialLoaded && loading && (
          <div className="p-2 flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-sm"
                style={{ height: i % 2 === 0 ? '6rem' : '5rem', backgroundColor: 'var(--skeleton)', border: '1px solid var(--border)' }} />
            ))}
          </div>
        )}

        {initialLoaded && visible.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-2 font-mono" style={{ color: 'var(--text-dim)' }}>
            <span className="text-3xl" style={{ color: `${color}25` }}>◈</span>
            <span className="text-[10px] tracking-widest">NO ARTICLES</span>
          </div>
        )}

        {visible.length > 0 && (
          <div className="flex flex-col">
            {visible.map((item) => (
              <NewsCard
                key={item.id}
                item={item}
                read={readIds.has(item.id)}
                bookmarked={bookmarkIds.has(item.id)}
                onRead={onRead}
                onBookmark={onBookmark}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
