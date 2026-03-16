'use client'

import { useState, useRef } from 'react'
import { NewsItem, relativeTime, absoluteTime } from '@/lib/rss'
import { getFeedMeta } from '@/lib/feedMeta'
import CometModal from './CometModal'

interface Props {
  item: NewsItem
  read: boolean
  bookmarked: boolean
  onRead: (id: string) => void
  onBookmark: (id: string) => void
}

function CometIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20l7-7"/><path d="M14 4l6 6-8 8-6-6z"/><path d="M18 2l4 4"/>
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5"/>
    </svg>
  )
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
  const [copied, setCopied] = useState(false)
  const [cometOpen, setCometOpen] = useState(false)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleClick() {
    onRead(item.id)
    if (!item.link) return
    if (item.link.includes('news.google.com')) {
      const cleanTitle = item.title.replace(/\s*-\s*(Bloomberg|Reuters)$/i, '')
      window.open(`https://www.google.com/search?q=${encodeURIComponent(cleanTitle)}`, '_blank', 'noopener,noreferrer')
    } else {
      window.open(item.link, '_blank', 'noopener,noreferrer')
    }
  }

  function handleBookmark(e: React.MouseEvent) {
    e.stopPropagation()
    onBookmark(item.id)
  }

  function handleComet(e: React.MouseEvent) {
    e.stopPropagation()
    setCometOpen(true)
  }

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    navigator.clipboard.writeText(item.title)
    setCopied(true)
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopied(false), 1500)
  }

  return (
    <article
      onClick={handleClick}
      className="group relative flex flex-col cursor-pointer select-none transition-colors duration-150"
      style={{
        // Read: blend into bg, no surface lift, neutral border
        // Unread: surface bg, coloured left accent
        backgroundColor: read ? 'var(--bg)' : 'var(--surface)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${read ? 'var(--border-dim)' : meta.color}`,
      }}
      onMouseEnter={(e) => { if (!read) e.currentTarget.style.backgroundColor = 'var(--hover)' }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = read ? 'var(--bg)' : 'var(--surface)' }}
    >
      {/* Coloured top accent — unread only */}
      {!read && (
        <div style={{ height: 1, background: `linear-gradient(90deg, ${meta.color}50, transparent 65%)` }} />
      )}

      <div className="flex flex-col gap-2 p-3">
        {/* Row 1: tag + bookmark + time */}
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold tracking-widest rounded-sm border font-mono shrink-0"
            style={{
              color: read ? 'var(--text-ui)' : meta.color,
              backgroundColor: read ? 'transparent' : meta.bg,
              borderColor: read ? 'var(--border)' : meta.border,
            }}
          >
            <span style={{ fontSize: 9 }}>{meta.symbol}</span>
            {meta.label}
          </span>

          <div className="flex-1" />

          {/* Bookmark */}
          <button
            onClick={handleBookmark}
            title={bookmarked ? 'Remove bookmark' : 'Save for later'}
            className="shrink-0 flex items-center justify-center transition-all duration-150 hover:scale-110"
            style={{ color: bookmarked ? 'var(--src-FED)' : 'var(--text-dim)' }}
          >
            <BookmarkIcon filled={bookmarked} />
          </button>

          {/* Time */}
          <time
            dateTime={item.pubDate.toISOString()}
            title={abs}
            className="font-mono text-[10px] whitespace-nowrap shrink-0"
            style={{ color: 'var(--text-lo)' }}
          >
            {rel}
          </time>
        </div>

        {/* Title + copy button */}
        <div className="flex items-start gap-1.5">
          <h3
            className="flex-1 text-[13px] font-semibold leading-snug line-clamp-3 font-mono"
            style={{ color: read ? 'var(--text-lo)' : 'var(--text-hi)' }}
          >
            {item.title}
          </h3>
          <button
            onClick={handleComet}
            title="Open in Comet"
            className="shrink-0 mt-0.5 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-150 hover:scale-110"
            style={{ color: 'var(--text-dim)' }}
          >
            <CometIcon />
          </button>
          <button
            onClick={handleCopy}
            title={copied ? 'Copied!' : 'Copy title'}
            className="shrink-0 mt-0.5 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-150 hover:scale-110"
            style={{ color: copied ? '#34d399' : 'var(--text-dim)' }}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>
        </div>

        {/* Timestamp */}
        <div
          className="pt-1.5 mt-auto font-mono text-[10px]"
          style={{ borderTop: '1px solid var(--border-dim)', color: 'var(--text-lo)' }}
        >
          {abs}
        </div>
      </div>

      {/* Bookmark gold accent on read cards */}
      {bookmarked && (
        <div
          className="absolute top-0 right-0 bottom-0 w-0.5"
          style={{ backgroundColor: 'var(--feed-fed-press)' }}
        />
      )}

      {/* Comet AI modal */}
      {cometOpen && <CometModal item={item} onClose={() => setCometOpen(false)} />}
    </article>
  )
}
