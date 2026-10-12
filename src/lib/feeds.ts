// RSS sources and server-side fetching (used by /api/rss and /api/jev).
// Server only: browsers cannot fetch these feeds directly (CORS).

const NBP_URL =
  'https://news.google.com/rss/search?q=NBP+OR+%22Narodowy+Bank+Polski%22+OR+%22Narodowego+Banku+Polskiego%22+OR+RPP+OR+%22Rada+Polityki+Pieni%C4%99%C5%BCnej%22+OR+inflacja+OR+%22stopy+procentowe%22+OR+%22stopa+procentowa%22+OR+Glapi%C5%84ski+OR+Kotecki+OR+Tyrowicz+OR+Wnorowski+OR+D%C4%85browski+OR+%22Iwona+Duda%22+OR+Janczyk+OR+Kochalski+OR+Litwiniuk+OR+Mas%C5%82owska+OR+Zarzecki&hl=pl&gl=PL&ceid=PL:pl'

export interface FeedConfig {
  url: string
  source: string
  label: string
}

export const FEEDS: FeedConfig[] = [
  { url: 'https://www.federalreserve.gov/feeds/press_all.xml', source: 'FED', label: 'PRESS' },
  { url: 'https://www.federalreserve.gov/feeds/speeches.xml',  source: 'FED', label: 'SPEECH' },
  { url: 'https://www.federalreserve.gov/feeds/fomc.xml',      source: 'FED', label: 'FOMC' },
  { url: 'https://www.federalreserve.gov/feeds/clp.xml',        source: 'FED', label: 'POLICY' },
  { url: 'https://www.federalreserve.gov/feeds/feds_notes.xml', source: 'FED', label: 'NOTES' },
  { url: 'https://www.ecb.europa.eu/rss/press.html',           source: 'ECB', label: 'PRESS' },
  { url: 'https://www.ecb.europa.eu/rss/speeches.html',        source: 'ECB', label: 'SPEECH' },
  { url: 'https://www.ecb.europa.eu/rss/blog.html',            source: 'ECB', label: 'BLOG' },
  { url: 'https://www.ecb.europa.eu/rss/pub.html',             source: 'ECB', label: 'PUB' },
  { url: NBP_URL,                                              source: 'NBP', label: 'NEWS' },
  { url: 'https://news.google.com/rss/search?q=site:reuters.com/markets&hl=en-US&gl=US&ceid=US:en',  source: 'REUTERS', label: 'MARKETS' },
  { url: 'https://news.google.com/rss/search?q=site:reuters.com/business&hl=en-US&gl=US&ceid=US:en', source: 'REUTERS', label: 'BUSINESS' },
  { url: 'https://news.google.com/rss/search?q=site:reuters.com/world&hl=en-US&gl=US&ceid=US:en',    source: 'REUTERS', label: 'WORLD' },
  { url: 'https://feeds.bloomberg.com/markets/news.rss',   source: 'BLOOMBERG', label: 'MARKETS' },
  { url: 'https://feeds.bloomberg.com/economics/news.rss', source: 'BLOOMBERG', label: 'ECONOMICS' },
  { url: 'https://feeds.bloomberg.com/politics/news.rss',  source: 'BLOOMBERG', label: 'POLITICS' },
  { url: 'https://static.stooq.pl/rss/pl/b.rss', source: 'STOOQ', label: 'BIZNES' },
  { url: 'https://static.stooq.pl/rss/pl/c.rss', source: 'STOOQ', label: 'KRAJ' },
  { url: 'https://static.stooq.pl/rss/pl/w.rss', source: 'STOOQ', label: 'ŚWIAT' },
  { url: 'https://api.axios.com/feed/',           source: 'AXIOS', label: 'NEWS' },
  { url: 'https://seekingalpha.com/market_currents.xml', source: 'SEEKINGALPHA', label: 'CURRENTS' },
]

const TIMEOUT_MS = 8000
const STALE_MAX_MS = 30 * 60_000   // a feed that stopped answering keeps showing its last headlines this long
const RETRY_MAX_MS = 10 * 60_000

// Per feed, per server instance: the last good body and how often it failed in a row.
// A feed that keeps failing (blocked, hanging) is retried with growing pauses (after the
// 2nd failure in a row: 2, 4, 8, then 10 min) instead of holding up every refresh of the others.
interface FeedState { xml?: string; okAt: number; fails: number; failedAt: number; error: string }
const states = new Map<string, FeedState>()
const stateOf = (url: string): FeedState => {
  let st = states.get(url)
  if (!st) states.set(url, (st = { okAt: 0, fails: 0, failedAt: 0, error: '' }))
  return st
}

async function fetchFeedXML(url: string): Promise<string> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CentralBankTerminal/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } catch (e) {
    throw e instanceof Error && e.name === 'AbortError' ? new Error(`no answer in ${TIMEOUT_MS / 1000}s`) : e
  } finally {
    clearTimeout(timer)
  }
}

async function loadFeed(feed: FeedConfig): Promise<string> {
  const st = stateOf(feed.url)
  const now = Date.now()
  const pause = Math.min(RETRY_MAX_MS, 60_000 * 2 ** Math.max(0, st.fails - 1))
  if (st.fails > 0 && now - st.failedAt < pause) {
    if (st.xml && now - st.okAt < STALE_MAX_MS) return st.xml
    throw new Error(st.error)
  }
  try {
    const xml = await fetchFeedXML(feed.url)
    st.xml = xml; st.okAt = now; st.fails = 0
    return xml
  } catch (e) {
    st.fails++; st.failedAt = Date.now()
    st.error = e instanceof Error ? e.message : 'Unknown error'
    if (st.xml && now - st.okAt < STALE_MAX_MS) return st.xml
    throw e
  }
}

export interface RawFeed { source: string; label: string; xml: string }

export async function fetchAllFeedXml(): Promise<{ feeds: RawFeed[]; errors: { feed: string; message: string }[] }> {
  const results = await Promise.allSettled(
    FEEDS.map(async (feed) => ({ source: feed.source, label: feed.label, xml: await loadFeed(feed) }))
  )
  const feeds: RawFeed[] = []
  const errors: { feed: string; message: string }[] = []
  results.forEach((result, i) => {
    const config = FEEDS[i]
    if (result.status === 'fulfilled') feeds.push(result.value)
    else errors.push({ feed: `${config.source} ${config.label}`, message: result.reason instanceof Error ? result.reason.message : 'Unknown error' })
  })
  return { feeds, errors }
}
