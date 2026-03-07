'use client'

import { Source } from '@/lib/rss'
import { FEED_META, SOURCE_COLOR, SOURCE_SUBFEEDS } from '@/lib/feedMeta'

export type Filter = 'ALL' | Source | 'SAVED'

interface Props {
  source: Filter
  subFilters: Set<string>
  counts: Record<Filter, number>
  subCounts: Record<string, number>
  onSourceChange: (s: Filter) => void
  onSubFilterToggle: (label: string) => void
}

const SOURCES: { value: Filter; name: string }[] = [
  { value: 'ALL',   name: 'ALL'   },
  { value: 'FED',   name: 'FED'   },
  { value: 'ECB',   name: 'ECB'   },
  { value: 'NBP',   name: 'NBP'   },
  { value: 'SAVED', name: '★ SAVED' },
]

export default function FilterBar({ source, subFilters, counts, subCounts, onSourceChange, onSubFilterToggle }: Props) {
  const subfeeds = (source !== 'ALL' && source !== 'SAVED') ? SOURCE_SUBFEEDS[source] ?? [] : []

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Level 1: Source buttons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {SOURCES.map(({ value, name }) => {
          const isActive = source === value
          const isSaved  = value === 'SAVED'
          const color    = isSaved ? '#f59e0b' : value === 'ALL' ? '#94a3b8' : SOURCE_COLOR[value]
          const count    = counts[value] ?? 0

          return (
            <button
              key={value}
              onClick={() => onSourceChange(value)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold tracking-widest border rounded-sm font-mono transition-all duration-100"
              style={
                isActive
                  ? { color, backgroundColor: `${color}15`, borderColor: `${color}55`, boxShadow: `0 0 8px ${color}20` }
                  : { color: `${color}90`, borderColor: `${color}30`, backgroundColor: 'transparent' }
              }
            >
              {/* Sub-feed symbol dots for FED/ECB/NBP */}
              {!isSaved && value !== 'ALL' && (
                <span className="flex gap-0.5">
                  {(SOURCE_SUBFEEDS[value] ?? []).map((lbl) => {
                    const meta = FEED_META[`${value}::${lbl}`]
                    return (
                      <span key={lbl} title={meta?.label} style={{ color: meta?.color, fontSize: '8px', opacity: isActive ? 1 : 0.55 }}>
                        {meta?.symbol}
                      </span>
                    )
                  })}
                </span>
              )}

              {name}

              <span className="font-mono tabular-nums" style={{ opacity: isActive ? 0.75 : 0.55, fontSize: '10px' }}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Level 2: Sub-feed channel chips */}
      {subfeeds.length > 1 && (
        <div className="flex items-center gap-1 flex-wrap pl-0.5">
          <span className="text-[9px] font-mono tracking-widest uppercase mr-1" style={{ color: 'var(--text-ui)' }}>
            CHANNEL
          </span>
          {subfeeds.map((lbl) => {
            const meta  = FEED_META[`${source}::${lbl}`]
            if (!meta) return null
            const count = subCounts[`${source}::${lbl}`] ?? 0
            const isOn  = subFilters.has(lbl)
            return (
              <button
                key={lbl}
                onClick={() => onSubFilterToggle(lbl)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold tracking-wider border rounded-sm font-mono transition-all duration-100"
                style={
                  isOn
                    ? { color: meta.color, backgroundColor: meta.bg, borderColor: `${meta.color}50` }
                    : { color: `${meta.color}90`, borderColor: `${meta.color}35`, backgroundColor: 'transparent' }
                }
              >
                <span style={{ fontSize: '9px', opacity: isOn ? 1 : 0.7 }}>{meta.symbol}</span>
                {lbl}
                <span style={{ opacity: 0.6, fontSize: '9px' }}>{count}</span>
              </button>
            )
          })}
          {subFilters.size > 0 && (
            <button
              onClick={() => subFilters.forEach((lbl) => onSubFilterToggle(lbl))}
              className="px-2 py-1 text-[9px] font-mono tracking-widest border rounded-sm"
              style={{ color: 'var(--text-ui)', borderColor: 'var(--border)' }}
            >
              ✕ CLEAR
            </button>
          )}
        </div>
      )}
    </div>
  )
}
