export type Source = 'FED' | 'ECB' | 'NBP' | 'REUTERS'

export interface NewsItem {
  id: string
  title: string
  link: string
  description: string
  pubDate: Date
  source: Source
  feedLabel: string
}

interface FeedConfig {
  source: Source
  label: string
}

function stripHtml(html: string): string {
  if (typeof window === 'undefined') return html.replace(/<[^>]+>/g, '')
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    return (doc.body.textContent || '').trim()
  } catch {
    return html.replace(/<[^>]+>/g, '').trim()
  }
}

function getElText(parent: Element, selector: string): string {
  return parent.querySelector(selector)?.textContent?.trim() || ''
}

function makeId(config: FeedConfig, key: string): string {
  return `${config.source}::${config.label}::${key}`
}

function parseRSSDoc(doc: Document, config: FeedConfig): NewsItem[] {
  const items: NewsItem[] = []

  const rssItems = doc.querySelectorAll('channel > item')
  if (rssItems.length > 0) {
    rssItems.forEach((item) => {
      const title = getElText(item, 'title')
      if (!title) return
      const linkEl = item.querySelector('link')
      const link = linkEl?.textContent?.trim() || item.querySelector('enclosure')?.getAttribute('url') || ''
      const description = stripHtml(getElText(item, 'description'))
      const pubDateStr = getElText(item, 'pubDate')
      const pubDate = pubDateStr ? new Date(pubDateStr) : new Date(0)
      items.push({
        id: makeId(config, link || title),
        title, link, description,
        pubDate: isNaN(pubDate.getTime()) ? new Date(0) : pubDate,
        source: config.source,
        feedLabel: config.label,
      })
    })
    return items
  }

  // Atom
  const entries = doc.querySelectorAll('entry')
  entries.forEach((entry) => {
    const title = getElText(entry, 'title')
    if (!title) return
    const linkEl =
      entry.querySelector('link[rel="alternate"]') ||
      entry.querySelector('link[href]') ||
      entry.querySelector('link')
    const link = linkEl?.getAttribute('href') || linkEl?.textContent?.trim() || ''
    const description = stripHtml(getElText(entry, 'summary') || getElText(entry, 'content'))
    const pubDateStr = getElText(entry, 'published') || getElText(entry, 'updated') || getElText(entry, 'dc\\:date')
    const pubDate = pubDateStr ? new Date(pubDateStr) : new Date(0)
    items.push({
      id: makeId(config, link || title),
      title, link, description,
      pubDate: isNaN(pubDate.getTime()) ? new Date(0) : pubDate,
      source: config.source,
      feedLabel: config.label,
    })
  })

  return items
}

export async function fetchAllFeeds(): Promise<{
  items: NewsItem[]
  errors: { feed: string; message: string }[]
}> {
  const res = await fetch('/api/rss', { cache: 'no-store' })
  if (!res.ok) throw new Error(`API error: ${res.status}`)

  const data: {
    feeds: { source: Source; label: string; xml: string }[]
    errors: { feed: string; message: string }[]
  } = await res.json()

  const allItems: NewsItem[] = []

  for (const feed of data.feeds) {
    try {
      const doc = new DOMParser().parseFromString(feed.xml, 'text/xml')
      const parseErr = doc.querySelector('parsererror')
      if (parseErr) continue
      const items = parseRSSDoc(doc, { source: feed.source, label: feed.label })
      allItems.push(...items)
    } catch {
      // skip malformed feed
    }
  }

  const seen = new Set<string>()
  const unique = allItems.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })

  unique.sort((a, b) => {
    const ta = a.pubDate.getTime()
    const tb = b.pubDate.getTime()
    if (ta === 0 && tb === 0) return 0
    if (ta === 0) return 1
    if (tb === 0) return -1
    return tb - ta
  })

  return { items: unique, errors: data.errors }
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
