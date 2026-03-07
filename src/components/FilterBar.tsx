'use client'

import { Source } from '@/lib/rss'
import { FEED_META, SOURCE_COLOR, SOURCE_SUBFEEDS } from '@/lib/feedMeta'

export type Filter = 'ALL' | Source

interface Props {
  source: Filter
  subFilters: Set<string>          // active sub-feed labels, e.g. {'FOMC', 'PRESS'}
  counts: Record<Filter, number>
  subCounts: Record<string, number> // key = 'FED::PRESS' etc.
  onSourceChange: (s: Filter) => void
  onSubFilterToggle: (label: string) => void
}

const SOURCES: { value: Filter; name: string }[] = [
  { value: 'ALL', name: 'ALL' },
  { value: 'FED', name: 'FED' },
  { value: 'ECB', name: 'ECB' },
  { value: 'NBP', name: 'NBP' },
]

export default function FilterBar({
  source,
  subFilters,
  counts,
  subCounts,
  onSourceChange,
  onSubFilterToggle,
}: Props) {
  const subfeeds = source !== 'ALL' ? SOURCE_SUBFEEDS[source] ?? [] : []

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* ── Level 1: Source tabs ── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {SOURCES.map(({ value, name }) => {
          const isActive = source === value
          const color = value === 'ALL' ? '#94a3b8' : SOURCE_COLOR[value]
          const count = counts[value] ?? 0

          return (
            <button
              key={value}
              onClick={() => onSourceChange(value)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold tracking-widest border rounded-sm font-mono transition-all duration-100"
              style={
                isActive
                  ? {
                      color,
                      backgroundColor: value === 'ALL' ? 'rgba(148,163,184,0.08)' : `${color}12`,
                      borderColor: `${color}50`,
                      boxShadow: `0 0 8px ${color}20`,
                    }
                  : {
                      color: `${color}55`,
                      borderColor: `${color}18`,
                      backgroundColor: 'transparent',
                    }
              }
            >
              {/* Sub-feed dots inside FED/ECB buttons */}
              {value !== 'ALL' && (
                <span className="flex gap-0.5">
                  {(SOURCE_SUBFEEDS[value] ?? []).map((lbl) => {
                    const meta = FEED_META[`${value}::${lbl}`]
                    return (
                      <span
                        key={lbl}
                        title={meta?.label}
                        style={{
                          color: meta?.color,
                          fontSize: '8px',
                          opacity: isActive ? 1 : 0.4,
                        }}
                      >
                        {meta?.symbol}
                      </span>
                    )
                  })}
                </span>
              )}

              {name}

              <span
                className="font-mono tabular-nums"
                style={{ opacity: isActive ? 0.7 : 0.4, fontSize: '10px' }}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Level 2: Sub-feed channel chips (only when a source is selected) ── */}
      {subfeeds.length > 1 && (
        <div className="flex items-center gap-1 flex-wrap pl-0.5">
          <span
            className="text-[9px] font-mono tracking-widest uppercase mr-1"
            style={{ color: '#2a3d55' }}
          >
            CHANNEL
          </span>

          {subfeeds.map((lbl) => {
            const metaKey = `${source}::${lbl}`
            const meta = FEED_META[metaKey]
            if (!meta) return null
            const count = subCounts[metaKey] ?? 0
            const isOn = subFilters.has(lbl)

            return (
              <button
                key={lbl}
                onClick={() => onSubFilterToggle(lbl)}
                title={`Filter to ${meta.label} only`}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold tracking-wider border rounded-sm font-mono transition-all duration-100"
                style={
                  isOn
                    ? {
                        color: meta.color,
                        backgroundColor: meta.bg,
                        borderColor: `${meta.color}50`,
                        boxShadow: `0 0 6px ${meta.color}18`,
                      }
                    : {
                        color: `${meta.color}60`,
                        borderColor: `${meta.color}20`,
                        backgroundColor: 'transparent',
                      }
                }
              >
                <span style={{ fontSize: '9px', color: meta.color, opacity: isOn ? 1 : 0.5 }}>
                  {meta.symbol}
                </span>
                {lbl}
                <span style={{ opacity: 0.5, fontSize: '9px' }}>{count}</span>
              </button>
            )
          })}

          {/* Clear sub-filters shortcut */}
          {subFilters.size > 0 && (
            <button
              onClick={() => subFilters.forEach((lbl) => onSubFilterToggle(lbl))}
              className="px-2 py-1 text-[9px] font-mono tracking-widest border rounded-sm transition-all duration-100"
              style={{ color: '#3a5570', borderColor: '#1a2d45' }}
            >
              ✕ CLEAR
            </button>
          )}
        </div>
      )}
    </div>
  )
}
