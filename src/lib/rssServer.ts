// Server-side RSS / Atom parsing. Ids (source::feed::link), titles and dedupe are
// the ones the app has always used, so read / bookmark state stays valid.
import { XMLParser } from 'fast-xml-parser'
import { NewsItem, Source, FeedConfig, makeId, suffixTitle, finalizeItems } from './rss'
import { fetchAllFeedXml } from './feeds'

const NEWS_TTL_MS = 60_000 // RSS feeds are fetched and parsed at most once a minute per server instance

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  processEntities: true,
  htmlEntities: true,
  isArray: (name) => ['channel', 'item', 'entry', 'link'].includes(name),
  // Descriptions and full article bodies are never shown: keep them as raw text so the
  // parser does not walk / decode them (the bulk of the CPU on large feeds)
  stopNodes: ['*.description', '*.content:encoded', '*.content', '*.summary'],
})

type Node = Record<string, unknown>
const asArray = (v: unknown): Node[] => (Array.isArray(v) ? v : v == null ? [] : [v]) as Node[]

function text(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string' || typeof v === 'number') return String(v).trim()
  if (Array.isArray(v)) return text(v[0])
  if (typeof v === 'object') return text((v as Node)['#text'])
  return ''
}

function toDate(s: string): Date {
  const d = s ? new Date(s) : new Date(0)
  return isNaN(d.getTime()) ? new Date(0) : d
}

// Collect every value stored under `key` anywhere in the tree (like querySelectorAll)
function collect(node: unknown, key: string, out: Node[] = []): Node[] {
  if (Array.isArray(node)) { node.forEach((n) => collect(n, key, out)); return out }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node as Node)) {
      if (k === key) out.push(...asArray(v))
      else if (!k.startsWith('@_') && k !== '#text') collect(v, key, out)
    }
  }
  return out
}

export function parseFeedXml(xml: string, config: FeedConfig): NewsItem[] {
  let doc: unknown
  try { doc = parser.parse(xml) } catch { return [] }
  const items: NewsItem[] = []

  // RSS: <channel><item>
  const rssItems = collect(doc, 'channel').flatMap((ch) => asArray(ch.item))
  if (rssItems.length > 0) {
    for (const it of rssItems) {
      const title = suffixTitle(text(it.title), config)
      if (!title) continue
      const enclosure = asArray(it.enclosure)[0]
      const link = text(asArray(it.link)[0]) || (enclosure ? String(enclosure['@_url'] ?? '') : '')
      items.push({
        id: makeId(config, link || title),
        title, link,
        description: '',
        pubDate: toDate(text(it.pubDate)),
        source: config.source,
        feedLabel: config.label,
      })
    }
    return items
  }

  // Atom: <entry>
  for (const en of collect(doc, 'entry')) {
    const title = suffixTitle(text(en.title), config)
    if (!title) continue
    const links = asArray(en.link)
    const linkEl = links.find((l) => l['@_rel'] === 'alternate') ?? links.find((l) => l['@_href']) ?? links[0]
    const link = linkEl ? String(linkEl['@_href'] ?? text(linkEl)) : ''
    items.push({
      id: makeId(config, link || title),
      title, link,
      description: '',
      pubDate: toDate(text(en.published) || text(en.updated) || text(en['dc:date'])),
      source: config.source,
      feedLabel: config.label,
    })
  }
  return items
}

export interface NewsSnapshot {
  items: NewsItem[]
  errors: { feed: string; message: string }[]
  fetchedAt: number
  body: string // compact JSON for /api/rss, serialised once per fetch
}

function compactBody(items: NewsItem[], errors: NewsSnapshot['errors'], fetchedAt: number): string {
  return JSON.stringify({
    fetchedAt,
    errors,
    items: items.map(({ id, title, link, pubDate, source, feedLabel }) => ({ id, title, link, source, feedLabel, pubDate: pubDate.getTime() })),
  })
}

let cache: NewsSnapshot | null = null
let inflight: Promise<NewsSnapshot> | null = null

// All headlines, deduped and sorted. Shared by /api/rss and /api/top: one fetch + parse
// per minute serves every refresh and every 4H / 8H / 24H switch; concurrent callers
// wait for the same fetch instead of starting their own.
export async function getNews(): Promise<NewsSnapshot> {
  if (cache && Date.now() - cache.fetchedAt < NEWS_TTL_MS) return cache
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const { feeds, errors } = await fetchAllFeedXml()
      const items = finalizeItems(feeds.flatMap((f) => parseFeedXml(f.xml, { source: f.source as Source, label: f.label })))
      const fetchedAt = Date.now()
      cache = { items, errors, fetchedAt, body: compactBody(items, errors, fetchedAt) }
      return cache
    } finally {
      inflight = null
    }
  })()
  return inflight
}

export async function loadAllItems(): Promise<NewsItem[]> {
  return (await getNews()).items
}
