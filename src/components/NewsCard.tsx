'use client'

import { NewsItem, relativeTime, absoluteTime } from '@/lib/rss'
import { getFeedMeta } from '@/lib/feedMeta'

interface Props {
  item: NewsItem
  read: boolean
  onRead: (id: string) => void
}

export default function NewsCard({ item, read, onRead }: Props) {
  const meta = getFeedMeta(item.source, item.feedLabel)
  const rel = relativeTime(item.pubDate)
  const abs = absoluteTime(item.pubDate)

  const bg = read ? '#070c12' : '#0a1421'

  function handleClick() {
    onRead(item.id)
    if (item.link) window.open(item.link, '_blank', 'noopener,noreferrer')
  }

  return (
    <article
      onClick={handleClick}
      className="group relative flex flex-col cursor-pointer select-none transition-colors duration-150"
      style={{
        backgroundColor: bg,
        border: '1px solid #0f1a26',
        borderLeft: `3px solid ${read ? '#0f1a26' : meta.color}`,
        opacity: read ? 0.35 : 1,
      }}
      onMouseEnter={(e) => {
        if (!read) e.currentTarget.style.backgroundColor = '#0d1e35'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = bg
      }}
    >
      {/* Top accent gradient */}
      {!read && (
        <div
          style={{
            height: 1,
            background: `linear-gradient(90deg, ${meta.color}55, transparent 65%)`,
          }}
        />
      )}

      <div className="flex flex-col gap-2.5 p-3.5">
        {/* Tag + time */}
        <div className="flex items-start justify-between gap-2">
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold tracking-widest rounded-sm border font-mono shrink-0"
            style={{
              color: meta.color,
              backgroundColor: meta.bg,
              borderColor: `${meta.color}30`,
            }}
          >
            <span style={{ fontSize: 9 }}>{meta.symbol}</span>
            {meta.label}
          </span>

          <time
            dateTime={item.pubDate.toISOString()}
            title={abs}
            className="font-mono text-[10px] whitespace-nowrap mt-0.5"
            style={{ color: '#1e3555' }}
          >
            {rel}
          </time>
        </div>

        {/* Title */}
        <h3
          className="text-[13px] font-semibold leading-snug line-clamp-3 font-mono"
          style={{ color: read ? '#1a2d45' : '#c8d8e8' }}
        >
          {item.title}
        </h3>

        {/* Description */}
        {item.description && (
          <p
            className="text-[11px] leading-relaxed line-clamp-2 font-mono"
            style={{ color: '#1e3555' }}
          >
            {item.description}
          </p>
        )}

        {/* Absolute timestamp */}
        <div
          className="pt-2 mt-auto font-mono text-[10px]"
          style={{ borderTop: '1px solid #0d1822', color: '#162535' }}
        >
          {abs}
        </div>
      </div>

      {read && (
        <span
          className="absolute top-2 right-2 text-[9px] font-mono tracking-widest"
          style={{ color: '#0f1a26' }}
        >
          READ
        </span>
      )}
    </article>
  )
}
