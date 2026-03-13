import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const NBP_URL =
  'https://news.google.com/rss/search?q=NBP+OR+%22Narodowy+Bank+Polski%22+OR+%22Narodowego+Banku+Polskiego%22+OR+RPP+OR+%22Rada+Polityki+Pieni%C4%99%C5%BCnej%22+OR+inflacja+OR+%22stopy+procentowe%22+OR+%22stopa+procentowa%22+OR+Glapi%C5%84ski+OR+Kotecki+OR+Tyrowicz+OR+Wnorowski+OR+D%C4%85browski+OR+%22Iwona+Duda%22+OR+Janczyk+OR+Kochalski+OR+Litwiniuk+OR+Mas%C5%82owska+OR+Zarzecki&hl=pl&gl=PL&ceid=PL:pl'

interface FeedConfig {
  url: string
  source: string
  label: string
}

const FEEDS: FeedConfig[] = [
  { url: 'https://www.federalreserve.gov/feeds/press_all.xml', source: 'FED', label: 'PRESS' },
  { url: 'https://www.federalreserve.gov/feeds/speeches.xml',  source: 'FED', label: 'SPEECH' },
  { url: 'https://www.federalreserve.gov/feeds/fomc.xml',      source: 'FED', label: 'FOMC' },
  { url: 'https://www.federalreserve.gov/feeds/clp.xml',       source: 'FED', label: 'POLICY' },
  { url: 'https://www.ecb.europa.eu/rss/press.html',           source: 'ECB', label: 'PRESS' },
  { url: 'https://www.ecb.europa.eu/rss/speeches.html',        source: 'ECB', label: 'SPEECH' },
  { url: 'https://www.ecb.europa.eu/rss/blog.html',            source: 'ECB', label: 'BLOG' },
  { url: 'https://www.ecb.europa.eu/rss/pub.html',             source: 'ECB', label: 'PUB' },
  { url: NBP_URL,                                              source: 'NBP', label: 'NEWS' },
  { url: 'https://news.google.com/rss/search?q=site:reuters.com&hl=en-US&gl=US&ceid=US:en',    source: 'REUTERS',   label: 'NEWS' },
  { url: 'https://news.google.com/rss/search?q=site:bloomberg.com&hl=en-US&gl=US&ceid=US:en',  source: 'BLOOMBERG', label: 'NEWS' },
]

async function fetchFeedXML(url: string): Promise<string> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8000)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CentralBankTerminal/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.text()
  } catch (e) {
    clearTimeout(timer)
    throw e
  }
}

export async function GET() {
  const results = await Promise.allSettled(
    FEEDS.map(async (feed) => {
      const xml = await fetchFeedXML(feed.url)
      return { source: feed.source, label: feed.label, xml }
    })
  )

  const feeds: { source: string; label: string; xml: string }[] = []
  const errors: { feed: string; message: string }[] = []

  results.forEach((result, i) => {
    const config = FEEDS[i]
    if (result.status === 'fulfilled') {
      feeds.push(result.value)
    } else {
      const msg = result.reason instanceof Error ? result.reason.message : 'Unknown error'
      errors.push({ feed: `${config.source} ${config.label}`, message: msg })
    }
  })

  return NextResponse.json(
    { feeds, errors },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  )
}
