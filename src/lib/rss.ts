export type Source = 'FED' | 'ECB' | 'NBP'

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
  url: string
  source: Source
  label: string
}

const NBP_URL =
  'https://news.google.com/rss/search?q=NBP+OR+%22Narodowy+Bank+Polski%22+OR+%22Narodowego+Banku+Polskiego%22+OR+RPP+OR+%22Rada+Polityki+Pieni%C4%99%C5%BCnej%22+OR+inflacja+OR+%22stopy+procentowe%22+OR+%22stopa+procentowa%22+OR+Glapi%C5%84ski+OR+Kotecki+OR+Tyrowicz+OR+Wnorowski+OR+D%C4%85browski+OR+%22Iwona+Duda%22+OR+Janczyk+OR+Kochalski+OR+Litwiniuk+OR+Mas%C5%82owska+OR+Zarzecki&hl=pl&gl=PL&ceid=PL:pl'

export const FEEDS: FeedConfig[] = [
  { url: 'https://www.federalreserve.gov/feeds/press_all.xml', source: 'FED', label: 'PRESS' },
  { url: 'https://www.federalreserve.gov/feeds/speeches.xml',  source: 'FED', label: 'SPEECH' },
  { url: 'https://www.federalreserve.gov/feeds/fomc.xml',      source: 'FED', label: 'FOMC' },
  { url: 'https://www.federalreserve.gov/feeds/clp.xml',       source: 'FED', label: 'POLICY' },
  { url: 'https://www.ecb.europa.eu/rss/press.html',           source: 'ECB', label: 'PRESS' },
  { url: 'https://www.ecb.europa.eu/rss/speeches.html',        source: 'ECB', label: 'SPEECH' },
  { url: 'https://www.ecb.europa.eu/rss/blog.html',            source: 'ECB', label: 'BLOG' },
  { url: 'https://www.ecb.europa.eu/rss/pub.html',             source: 'ECB', label: 'PUB' },
  { url: NBP_URL,                                              source: 'NBP', label: 'NEWS' },
]

async function fetchWithTimeout(url: string, ms = 20000): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' })
    clearTimeout(timer)
    return res
  } catch (e) {
    clearTimeout(timer)
    if (ctrl.signal.aborted) throw new Error(`Timeout after ${ms / 1000}s`)
    throw e
  }
}

const PROXY_FACTORIES: ((url: string) => { proxyUrl: string; extract: (res: Response) => Promise<string> })[] = [
  (url) => ({
    proxyUrl: `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    extract: async (res) => ((await res.json()) as { contents: string }).contents,
  }),
  (url) => ({
    proxyUrl: `https://corsproxy.io/?${encodeURIComponent(url)}`,
    extract: (res) => res.text(),
  }),
  (url) => ({
    proxyUrl: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    extract: (res) => res.text(),
  }),
]

function looksLikeXML(text: string): boolean {
  const t = text.trimStart()
  if (t.startsWith('<?xml')) return true
  if (t.startsWith('<rss')) return true
  if (t.startsWith('<feed')) return true
  // Reject HTML pages that proxies return on error
  if (t.startsWith('<!DOCTYPE html') || t.startsWith('<html')) return false
  // Accept other XML-ish content (Atom, namespaced feeds)
  return t.startsWith('<') && !t.startsWith('<!DOCTYPE')
}

async function fetchXML(originalUrl: string): Promise<string> {
  const errors: string[] = []

  for (const factory of PROXY_FACTORIES) {
    const { proxyUrl, extract } = factory(originalUrl)
    try {
      const res = await fetchWithTimeout(proxyUrl)
      if (!res.ok) { errors.push(`${res.status}`); continue }
      const text = await extract(res)
      if (text && looksLikeXML(text)) return text
      errors.push('Not XML (got HTML or empty)')
    } catch (e) {
      errors.push(e instanceof Error ? e.message : 'Unknown')
    }
  }

  throw new Error(`All proxies failed: ${errors.join(', ')}`)
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

async function fetchFeed(config: FeedConfig): Promise<NewsItem[]> {
  const xml = await fetchXML(config.url)
  const doc = new DOMParser().parseFromString(xml, 'text/xml')
  const parseErr = doc.querySelector('parsererror')
  if (parseErr) {
    const snippet = xml.slice(0, 120).replace(/\s+/g, ' ')
    throw new Error(`XML parse error (starts with: ${snippet}…)`)
  }
  return parseRSSDoc(doc, config)
}

export async function fetchAllFeeds(): Promise<{
  items: NewsItem[]
  errors: { feed: string; message: string }[]
}> {
  const allItems: NewsItem[] = []
  const errors: { feed: string; message: string }[] = []

  const results = await Promise.allSettled(FEEDS.map((f) => fetchFeed(f)))
  results.forEach((result, i) => {
    const config = FEEDS[i]
    if (result.status === 'fulfilled') {
      allItems.push(...result.value)
    } else {
      const msg = result.reason instanceof Error ? result.reason.message : 'Unknown error'
      errors.push({ feed: `${config.source} ${config.label}`, message: msg })
    }
  })

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

  return { items: unique, errors }
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
