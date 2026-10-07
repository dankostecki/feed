import { NewsItem } from './rss'

// Export for TypeSafe Jev (console.typesafe.ai/playground).
// The playground has two fields: State (plain text) and Questions (JSON).
// Headlines go in as the options of a Choice question; Jev returns a probability
// for every option, so sorting by probability gives the importance ranking.

const MAX_OPTIONS = 250 // Jev Choice accepts up to 255 options per question
const LABEL_MAX = 60

const pad = (n: number) => String(n).padStart(2, '0')
function utc(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`
}

function clip(s: string, max: number): string {
  const t = s.replace(/\s+/g, ' ').trim()
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t
}

export function itemsInWindow(items: NewsItem[], hours: number, now = new Date()): NewsItem[] {
  const from = now.getTime() - hours * 3600_000
  return items
    .filter((i) => {
      const t = i.pubDate.getTime()
      return t >= from && t <= now.getTime() + 5 * 60_000
    })
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())
}

export interface JevExport {
  count: number
  state: string
  questions: string
  file: string
  filename: string
}

export type JevQuestions = Record<string, { type: 'choice'; instructions: string; criteria: Record<string, string> }>

export interface JevRequest {
  count: number
  from: Date
  state: string
  questions: JevQuestions
  byLabel: Record<string, NewsItem> // option label → headline, to read the answer back
}

// The two playground fields (State, Questions) for the headlines of the last `hours`.
// Used both for the .txt export and for the server call to the Jev API.
export function buildJevRequest(items: NewsItem[], hours: number, now = new Date()): JevRequest {
  const list = itemsInWindow(items, hours, now)
  const from = new Date(now.getTime() - hours * 3600_000)
  const digits = String(Math.max(list.length, 1)).length

  const label = (i: number, it: NewsItem) =>
    clip(`${String(i + 1).padStart(digits, '0')} ${it.source} ${it.title}`, LABEL_MAX)
  const line = (it: NewsItem) => `[${it.source} · ${it.feedLabel} · ${utc(it.pubDate)}] ${clip(it.title, 300)}`

  // Over the option limit: split into evenly sized questions over the same state
  const size = Math.ceil(list.length / Math.max(1, Math.ceil(list.length / MAX_OPTIONS)))
  const chunks: NewsItem[][] = []
  for (let i = 0; i < list.length; i += size) chunks.push(list.slice(i, i + size))

  const questions: JevQuestions = {}
  const byLabel: Record<string, NewsItem> = {}
  chunks.forEach((chunk, c) => {
    const offset = c * size
    const criteria: Record<string, string> = {}
    chunk.forEach((it, j) => { const l = label(offset + j, it); criteria[l] = line(it); byLabel[l] = it })
    const key = chunks.length > 1 ? `most_important_${c + 1}` : 'most_important'
    questions[key] = {
      type: 'choice',
      instructions:
        'Which of these news headlines is the most important for financial markets right now? ' +
        'Judge expected market impact on the instruments listed in the state, not how dramatic the wording is.',
      criteria,
    }
  })

  const state = [
    `Financial news headlines published ${utc(from)} – ${utc(now)} (last ${hours}h), ${list.length} headlines from: FED, ECB, NBP (Polish central bank), Reuters, Bloomberg, Stooq (Polish), Axios.`,
    'The headlines are the options of the question. Some sources repeat the same story; a story covered by several sources is more important.',
    '',
    'The reader is a macro / TradFi trader following: S&P 500, Nasdaq 100, WTI and Brent oil, gold, silver, natural gas, copper, EUR/USD, USD/JPY, Bitcoin, Ethereum, and Polish markets (WIG, PLN).',
    '',
    'High importance: central bank rate decisions and policy guidance (Fed, ECB, NBP); inflation, jobs and GDP data, especially surprises; tariffs and trade policy; wars, sanctions and geopolitical shocks; oil and gas supply (OPEC+, outages); bank or market stress; major moves in the listed instruments.',
    'Low importance: opinion and analysis without new facts, routine speeches with no policy signal, single-company news with no market-wide effect, lifestyle, sport, minor local news.',
  ].join('\n')

  return { count: list.length, from, state, questions, byLabel }
}

export function buildJevExport(items: NewsItem[], hours: number, now = new Date()): JevExport {
  const { count, from, state, questions } = buildJevRequest(items, hours, now)
  const chunks = Object.keys(questions)
  const questionsJson = JSON.stringify(questions, null, 2)
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}-${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}`

  const file = [
    `JEV EXPORT · last ${hours}h · ${utc(from)} – ${utc(now)} · ${count} headlines`,
    'console.typesafe.ai/playground: paste section 1 into STATE and section 2 into QUESTIONS, then Run.',
    'Result: probability per headline. Higher probability = more important. Sort descending for the ranking.',
    chunks.length > 1 ? `Note: more than ${MAX_OPTIONS} headlines, split into ${chunks.length} questions (Jev limit 255 options each); each is ranked separately.` : '',
    '',
    '===== 1. STATE (copy everything until section 2) =====',
    state,
    '',
    '===== 2. QUESTIONS (copy the JSON below) =====',
    questionsJson,
    '',
  ].filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n')

  return { count, state, questions: questionsJson, file, filename: `jev-news-${hours}h-${stamp}.txt` }
}
