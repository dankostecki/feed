'use client'

import { NewsItem, relativeTime, absoluteTime } from '@/lib/rss'
import { getFeedMeta } from '@/lib/feedMeta'

interface Props {
  item: NewsItem
  read: boolean
  bookmarked: boolean
  onRead: (id: string) => void
  onBookmark: (id: string) => void
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="13" height="14" viewBox="0 0 13 16" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M1 1.5A0.5 0.5 0 011.5 1h10a0.5 0.5 0 01.5.5v13.15a.5.5 0 01-.8.4L6.5 11.8 1.8 15.05a.5.5 0 01-.8-.4V1.5z"/>
    </svg>
  )
}

export default function NewsCard({ item, read, bookmarked, onRead, onBookmark }: Props) {
  const meta = getFeedMeta(item.source, item.feedLabel)
  const rel  = relativeTime(item.pubDate)
  const abs  = absoluteTime(item.pubDate)

  function handleClick() {
    onRead(item.id)
    if (item.link) window.open(item.link, '_blank', 'noopener,noreferrer')
  }

  function handleBookmark(e: React.MouseEvent) {
    e.stopPropagation()
    onBookmark(item.id)
  }

  return (
    <article
      onClick={handleClick}
      className="group relative flex flex-col cursor-pointer select-none transition-colors duration-150"
      style={{
        backgroundColor: read ? 'var(--bg)' : 'var(--surface)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${read ? 'var(--border)' : meta.color}`,
        opacity: read ? 0.4 : 1,
      }}
      onMouseEnter={(e) => { if (!read) e.currentTarget.style.backgroundColor = 'var(--hover)' }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = read ? 'var(--bg)' : 'var(--surface)' }}
    >
      {/* Top accent line */}
      {!read && (
        <div style={{ height: 1, background: `linear-gradient(90deg, ${meta.color}50, transparent 65%)` }} />
      )}

      <div className="flex flex-col gap-2 p-3">
        {/* Row 1: tag + bookmark + time */}
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold tracking-widest rounded-sm border font-mono shrink-0"
            style={{ color: meta.color, backgroundColor: meta.bg, borderColor: `${meta.color}35` }}
          >
            <span style={{ fontSize: 9 }}>{meta.symbol}</span>
            {meta.label}
          </span>

          <div className="flex-1" />

          {/* Bookmark icon button */}
          <button
            onClick={handleBookmark}
            title={bookmarked ? 'Remove bookmark' : 'Save for later'}
            className="shrink-0 flex items-center justify-center transition-all duration-150 hover:scale-110"
            style={{ color: bookmarked ? '#f59e0b' : 'var(--text-dim)' }}
          >
            <BookmarkIcon filled={bookmarked} />
          </button>

          <time
            dateTime={item.pubDate.toISOString()}
            title={abs}
            className="font-mono text-[10px] whitespace-nowrap shrink-0"
            style={{ color: 'var(--text-lo)' }}
          >
            {rel}
          </time>
        </div>

        {/* Title */}
        <h3
          className="text-[13px] font-semibold leading-snug line-clamp-3 font-mono"
          style={{ color: read ? 'var(--text-dim)' : 'var(--text-hi)' }}
        >
          {item.title}
        </h3>

        {/* Absolute timestamp */}
        <div
          className="pt-1.5 mt-auto font-mono text-[10px]"
          style={{ borderTop: '1px solid var(--border-dim)', color: 'var(--text-lo)' }}
        >
          {abs}
        </div>
      </div>

      {read && !bookmarked && (
        <span className="absolute top-2 right-2 text-[9px] font-mono tracking-widest" style={{ color: 'var(--text-dim)' }}>
          READ
        </span>
      )}
    </article>
  )
}
