'use client'

import { useEffect, useRef, useState } from 'react'
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
  sourceOrder?: Source[]
  actions?: React.ReactNode
}

// Each source button has a fixed accent — vivid in both dark and light
const BTN: Record<string, { color: string; bg: string; bd: string }> = {
  ALL:   { color: 'var(--text-hi)',       bg: 'var(--hover)',      bd: 'var(--border)'     },
  FED:   { color: 'var(--src-FED)',       bg: 'var(--src-FED-bg)', bd: 'var(--src-FED-bd)' },
  ECB:   { color: 'var(--src-ECB)',       bg: 'var(--src-ECB-bg)', bd: 'var(--src-ECB-bd)' },
  NBP:     { color: 'var(--src-NBP)',       bg: 'var(--src-NBP-bg)',     bd: 'var(--src-NBP-bd)'     },
  REUTERS:   { color: 'var(--src-REUTERS)',   bg: 'var(--src-REUTERS-bg)',   bd: 'var(--src-REUTERS-bd)'   },
  BLOOMBERG: { color: 'var(--src-BLOOMBERG)', bg: 'var(--src-BLOOMBERG-bg)', bd: 'var(--src-BLOOMBERG-bd)' },
  STOOQ:     { color: 'var(--src-STOOQ)',     bg: 'var(--src-STOOQ-bg)',     bd: 'var(--src-STOOQ-bd)'     },
  AXIOS:     { color: 'var(--src-AXIOS)',     bg: 'var(--src-AXIOS-bg)',     bd: 'var(--src-AXIOS-bd)'     },
  SAVED:     { color: 'var(--feed-fed-press)', bg: 'var(--feed-fed-press-bg)', bd: 'var(--feed-fed-press-bd)' },
}

const DEFAULT_SOURCES: { value: Filter; label: string }[] = [
  { value: 'ALL',   label: 'ALL'   },
  { value: 'FED',   label: 'FED'   },
  { value: 'ECB',   label: 'ECB'   },
  { value: 'NBP',     label: 'NBP'     },
  { value: 'REUTERS',   label: 'REUTERS'   },
  { value: 'BLOOMBERG', label: 'BLOOMBERG' },
  { value: 'STOOQ',     label: 'STOOQ'     },
  { value: 'AXIOS',     label: 'AXIOS'     },
  { value: 'SAVED',     label: 'SAVED'     },
]

export default function FilterBar({ source, subFilters, counts, subCounts, onSourceChange, onSubFilterToggle, sourceOrder, actions }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [fade, setFade] = useState(false)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const update = () => setFade(el.scrollWidth - el.clientWidth - el.scrollLeft > 4)
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update); ro.observe(el)
    return () => { el.removeEventListener('scroll', update); ro.disconnect() }
  }, [counts, sourceOrder])

  // Use sourceOrder if provided: ALL first, then ordered sources, then SAVED at end
  const SOURCES = sourceOrder
    ? [
        { value: 'ALL' as Filter, label: 'ALL' },
        ...sourceOrder.map((s) => ({ value: s as Filter, label: s })),
        { value: 'SAVED' as Filter, label: 'SAVED' },
      ]
    : DEFAULT_SOURCES
  const subfeeds = (source !== 'ALL' && source !== 'SAVED') ? SOURCE_SUBFEEDS[source] ?? [] : []

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* ── Source buttons — clean, no dots/symbols inside ── */}
      <div className="flex items-center gap-2 w-full min-w-0">
      <div ref={scrollRef} className="flex items-center gap-1.5 overflow-x-auto no-scrollbar min-w-0 flex-1"
        style={fade ? { WebkitMaskImage: 'linear-gradient(to right, #000 calc(100% - 28px), transparent)', maskImage: 'linear-gradient(to right, #000 calc(100% - 28px), transparent)' } : undefined}>
        {SOURCES.map(({ value, label }) => {
          const isActive = source === value
          const { color, bg, bd } = BTN[value]
          const count = counts[value] ?? 0

          return (
            <button
              key={value}
              onClick={() => onSourceChange(value)}
              className="flex items-center gap-2 px-3.5 py-2.5 sm:py-2 text-[12px] font-bold tracking-widest border rounded-sm font-mono transition-all duration-100 shrink-0"
              style={
                isActive
                  ? {
                      color,
                      backgroundColor: bg,
                      borderColor: bd,
                      boxShadow: value !== 'ALL' ? `0 0 12px ${bd}, inset 0 0 8px ${bg}` : undefined,
                    }
                  : {
                      color,
                      backgroundColor: 'transparent',
                      borderColor: bd,
                    }
              }
            >
              {label}
              <span
                className="tabular-nums font-mono"
                style={{ fontSize: '12px', opacity: 0.75 }}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>
      {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
      </div>

      {/* ── Sub-feed channel chips ── */}
      {subfeeds.length > 1 && (
        <div className="flex items-center gap-1 overflow-x-auto sm:flex-wrap no-scrollbar pl-0.5">
          <span
            className="text-[11px] font-mono tracking-widest uppercase mr-1"
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
                className="flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-bold tracking-wider border rounded-sm font-mono transition-all duration-100 shrink-0 sm:shrink"
                style={
                  isOn
                    ? { color: meta.color, backgroundColor: meta.bg, borderColor: meta.border, boxShadow: `0 0 8px ${meta.border}` }
                    : { color: meta.color, backgroundColor: 'transparent', borderColor: meta.border }
                }
              >
                <span style={{ fontSize: '11px' }}>{meta.symbol}</span>
                {lbl}
                <span style={{ opacity: 0.65, fontSize: '11px' }}>{count}</span>
              </button>
            )
          })}
          {subFilters.size > 0 && (
            <button
              onClick={() => subFilters.forEach((lbl) => onSubFilterToggle(lbl))}
              className="px-2 py-1 text-[11px] font-mono tracking-widest border rounded-sm"
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
