export type Source = 'FED' | 'ECB' | 'NBP' | 'REUTERS' | 'BLOOMBERG' | 'STOOQ' | 'AXIOS'

export interface NewsItem {
  id: string
  title: string
  link: string
  description: string
  pubDate: Date
  source: Source
  feedLabel: string
}

export interface FeedConfig {
  source: Source
  label: string
}

export function makeId(config: FeedConfig, key: string): string {
  return `${config.source}::${config.label}::${key}`
}

export function suffixTitle(title: string, config: FeedConfig): string {
  if (config.source === 'BLOOMBERG' && !title.endsWith(' - Bloomberg')) return `${title} - Bloomberg`
  return title
}

// Headlines from /api/rss: parsed on the server (once a minute, shared CDN cache), so the
// browser downloads a compact list instead of every feed's raw XML.
export async function fetchAllFeeds(): Promise<{
  items: NewsItem[]
  errors: { feed: string; message: string }[]
}> {
  const res = await fetch('/api/rss')
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const data: {
    items: { id: string; title: string; link: string; source: Source; feedLabel: string; pubDate: number }[]
    errors: { feed: string; message: string }[]
  } = await res.json()
  const items = (data.items ?? []).map((i) => ({ ...i, description: '', pubDate: new Date(i.pubDate) }))
  return { items, errors: data.errors ?? [] }
}

export function relativeTime(date: Date): string {
  if (date.getTime() === 0) return 'n/a'
  const diff = Date.now() - date.getTime()
  const s = Math.floor(diff / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (s < 60) return `${s}s`
  if (m < 60) return `${m}m`
  if (h < 24) return `${h}h`
  if (d < 30) return `${d}d`
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function absoluteTime(date: Date): string {
  if (date.getTime() === 0) return '—'
  return date.toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
}

// Dedupe (same id, or same source + link across sub-feeds) and sort newest first.
// Shared by the browser feed and the server (/api/jev) so both see the same list.
export function finalizeItems(allItems: NewsItem[]): NewsItem[] {
  const seen = new Set<string>()
  const unique = allItems.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })

  // Cross-sub-feed dedup: same source + same link = same article
  const seenLinks = new Set<string>()
  const deduped = unique.filter((item) => {
    if (!item.link) return true
    const linkKey = `${item.source}::${item.link}`
    if (seenLinks.has(linkKey)) return false
    seenLinks.add(linkKey)
    return true
  })

  deduped.sort((a, b) => {
    const ta = a.pubDate.getTime()
    const tb = b.pubDate.getTime()
    if (ta === 0 && tb === 0) return 0
    if (ta === 0) return 1
    if (tb === 0) return -1
    return tb - ta
  })
  return deduped
}
