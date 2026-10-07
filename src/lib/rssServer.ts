// Server-side RSS / Atom parsing (Node has no DOMParser). Mirrors parseRSSDoc in
// rss.ts so ids, titles and dedupe match what the browser shows.
import { XMLParser } from 'fast-xml-parser'
import { NewsItem, Source, FeedConfig, makeId, suffixTitle, finalizeItems } from './rss'
import { fetchAllFeedXml } from './feeds'

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

const stripHtml = (html: string) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()

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
        description: stripHtml(text(it.description)),
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
      description: stripHtml(text(en.summary) || text(en.content)),
      pubDate: toDate(text(en.published) || text(en.updated) || text(en['dc:date'])),
      source: config.source,
      feedLabel: config.label,
    })
  }
  return items
}

// All headlines, as the browser would list them
export async function loadAllItems(): Promise<NewsItem[]> {
  const { feeds } = await fetchAllFeedXml()
  return finalizeItems(feeds.flatMap((f) => parseFeedXml(f.xml, { source: f.source as Source, label: f.label })))
}
