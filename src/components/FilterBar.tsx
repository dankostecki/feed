'use client'

import { Source } from '@/lib/rss'
import { FEED_META, SOURCE_COLOR, SOURCE_BG, SOURCE_BD, SOURCE_SUBFEEDS } from '@/lib/feedMeta'

export type Filter = 'ALL' | Source | 'SAVED'

interface Props {
  source: Filter
  subFilters: Set<string>
  counts: Record<Filter, number>
  subCounts: Record<string, number>
  onSourceChange: (s: Filter) => void
  onSubFilterToggle: (label: string) => void
}

// Each source button has a fixed accent — vivid in both dark and light
const BTN: Record<string, { color: string; bg: string; bd: string }> = {
  ALL:   { color: 'var(--text-hi)',       bg: 'var(--hover)',      bd: 'var(--border)'     },
  FED:   { color: 'var(--src-FED)',       bg: 'var(--src-FED-bg)', bd: 'var(--src-FED-bd)' },
  ECB:   { color: 'var(--src-ECB)',       bg: 'var(--src-ECB-bg)', bd: 'var(--src-ECB-bd)' },
  NBP:   { color: 'var(--src-NBP)',       bg: 'var(--src-NBP-bg)', bd: 'var(--src-NBP-bd)' },
  SAVED: { color: 'var(--feed-fed-press)', bg: 'var(--feed-fed-press-bg)', bd: 'var(--feed-fed-press-bd)' },
}

const SOURCES: { value: Filter; label: string }[] = [
  { value: 'ALL',   label: 'ALL'   },
  { value: 'FED',   label: 'FED'   },
  { value: 'ECB',   label: 'ECB'   },
  { value: 'NBP',   label: 'NBP'   },
  { value: 'SAVED', label: 'SAVED' },
]

export default function FilterBar({ source, subFilters, counts, subCounts, onSourceChange, onSubFilterToggle }: Props) {
  const subfeeds = (source !== 'ALL' && source !== 'SAVED') ? SOURCE_SUBFEEDS[source] ?? [] : []

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* ── Source buttons — clean, no dots/symbols inside ── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {SOURCES.map(({ value, label }) => {
          const isActive = source === value
          const { color, bg, bd } = BTN[value]
          const count = counts[value] ?? 0

          return (
            <button
              key={value}
              onClick={() => onSourceChange(value)}
              className="flex items-center gap-2 px-3.5 py-1.5 text-[11px] font-bold tracking-widest border rounded-sm font-mono transition-all duration-100"
              style={
                isActive
                  ? {
                      color,
                      backgroundColor: bg,
                      borderColor: bd,
                      boxShadow: value !== 'ALL' ? `0 0 10px ${bd}` : undefined,
                    }
                  : {
                      color,
                      backgroundColor: 'transparent',
                      borderColor: bd,
                      opacity: 0.45,
                    }
              }
            >
              {label}
              <span
                className="tabular-nums font-mono"
                style={{ fontSize: '10px', opacity: 0.75 }}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Sub-feed channel chips ── */}
      {subfeeds.length > 1 && (
        <div className="flex items-center gap-1 flex-wrap pl-0.5">
          <span
            className="text-[9px] font-mono tracking-widest uppercase mr-1"
            style={{ color: 'var(--text-ui)' }}
          >
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
                    ? { color: meta.color, backgroundColor: meta.bg, borderColor: meta.border }
                    : { color: meta.color, opacity: 0.45, borderColor: meta.border, backgroundColor: 'transparent' }
                }
              >
                <span style={{ fontSize: '9px' }}>{meta.symbol}</span>
                {lbl}
                <span style={{ opacity: 0.65, fontSize: '9px' }}>{count}</span>
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
