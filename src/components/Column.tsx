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
  loading: boolean
  initialLoaded: boolean
  onRead: (id: string) => void
  onSubFilterToggle: (label: string) => void
}

const SOURCE_FULL: Record<string, string> = {
  FED: 'Federal Reserve',
  ECB: 'European Central Bank',
  NBP: 'Narodowy Bank Polski',
}

export default function Column({
  source,
  items,
  subFilters,
  subCounts,
  readIds,
  loading,
  initialLoaded,
  onRead,
  onSubFilterToggle,
}: Props) {
  const color = SOURCE_COLOR[source]
  const subfeeds = SOURCE_SUBFEEDS[source] ?? []

  const visible =
    subFilters.size > 0
      ? items.filter((i) => subFilters.has(i.feedLabel))
      : items

  function clearFilters() {
    subFilters.forEach((l) => onSubFilterToggle(l))
  }

  return (
    <div
      className="flex flex-col flex-1 min-w-0 overflow-hidden"
      style={{ borderRight: '1px solid #0d1822' }}
    >
      {/* ── Column header ── */}
      <div
        className="flex-shrink-0"
        style={{
          backgroundColor: '#070c12',
          borderBottom: `1px solid ${color}25`,
          boxShadow: `0 1px 12px ${color}08`,
        }}
      >
        {/* Title row */}
        <div
          className="flex items-center justify-between px-3 py-2.5"
          style={{ borderBottom: '1px solid #0a1520' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}70` }}
            />
            <div className="flex flex-col leading-none">
              <span
                className="text-[13px] font-bold tracking-[0.12em] uppercase"
                style={{ color }}
              >
                {source}
              </span>
              <span className="text-[9px] font-mono" style={{ color: `${color}50` }}>
                {SOURCE_FULL[source]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {loading && (
              <span className="text-[9px] font-mono animate-pulse" style={{ color: `${color}60` }}>
                SYNC
              </span>
            )}
            <span
              className="text-[11px] font-mono tabular-nums font-bold"
              style={{ color: `${color}70` }}
            >
              {visible.length}
            </span>
          </div>
        </div>

        {/* Sub-feed filter chips */}
        {subfeeds.length > 1 && (
          <div className="flex items-center gap-1 px-3 py-1.5 flex-wrap">
            {subfeeds.map((lbl) => {
              const meta = FEED_META[`${source}::${lbl}`]
              if (!meta) return null
              const count = subCounts[`${source}::${lbl}`] ?? 0
              const isOn = subFilters.has(lbl)

              return (
                <button
                  key={lbl}
                  onClick={() => onSubFilterToggle(lbl)}
                  className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold tracking-wider border rounded-sm font-mono transition-all duration-100"
                  style={
                    isOn
                      ? {
                          color: meta.color,
                          backgroundColor: meta.bg,
                          borderColor: `${meta.color}40`,
                          boxShadow: `0 0 5px ${meta.color}15`,
                        }
                      : {
                          color: `${meta.color}45`,
                          borderColor: `${meta.color}15`,
                          backgroundColor: 'transparent',
                        }
                  }
                >
                  <span style={{ fontSize: 8 }}>{meta.symbol}</span>
                  {lbl}
                  <span style={{ opacity: 0.45 }}>{count}</span>
                </button>
              )
            })}

            {subFilters.size > 0 && (
              <button
                onClick={clearFilters}
                className="px-1.5 py-0.5 text-[9px] font-mono border rounded-sm transition-all"
                style={{ color: '#1e3050', borderColor: '#0f1a26' }}
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Scrollable body ── */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: 'thin', scrollbarColor: `${color}20 transparent` }}
      >
        {/* Loading skeleton */}
        {!initialLoaded && loading && (
          <div className="p-2 flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-sm"
                style={{
                  height: i % 2 === 0 ? '7rem' : '5.5rem',
                  backgroundColor: '#0b1320',
                  border: '1px solid #0f1a26',
                }}
              />
            ))}
          </div>
        )}

        {/* Empty */}
        {initialLoaded && visible.length === 0 && !loading && (
          <div
            className="flex flex-col items-center justify-center py-20 gap-2 font-mono"
            style={{ color: '#1a2d45' }}
          >
            <span className="text-3xl" style={{ color: `${color}20` }}>
              ◈
            </span>
            <span className="text-[10px] tracking-widest">NO ARTICLES</span>
          </div>
        )}

        {/* Cards — single column, no gap grid */}
        {visible.length > 0 && (
          <div className="flex flex-col divide-y" style={{ borderColor: '#0a1520' }}>
            {visible.map((item) => (
              <NewsCard
                key={item.id}
                item={item}
                read={readIds.has(item.id)}
                onRead={onRead}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
