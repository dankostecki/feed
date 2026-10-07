// Server-only client for TypeSafe Jev (POST /v1/systemone).
// The API key comes from the TYPESAFE_API_KEY environment variable (Vercel → Settings →
// Environment Variables); it is never sent to the browser.
import { NewsItem } from './rss'
import { JevRequest } from './jevExport'

const DEFAULT_URL = 'https://api.typesafe.ai/v1/systemone'
const DEFAULT_MODEL = 'jev-latest'
const TIMEOUT_MS = 30_000

export interface RankedHeadline {
  id: string
  title: string
  link: string
  source: NewsItem['source']
  feedLabel: string
  pubDate: string // ISO
  probability: number
}

export class JevError extends Error {
  constructor(public code: 'not_configured' | 'unauthorized' | 'rate_limited' | 'upstream' | 'bad_response', message: string, public status = 502) {
    super(message)
  }
}

interface ChoiceAnswer { type?: string; choice?: string; probabilities?: Record<string, number>; confidence?: number }
interface JevResponse { model?: string; answers?: Record<string, ChoiceAnswer>; usage?: unknown }

export async function rankWithJev(req: JevRequest): Promise<{ model: string; ranked: RankedHeadline[]; usage?: unknown }> {
  const key = process.env.TYPESAFE_API_KEY?.trim()
  if (!key) throw new JevError('not_configured', 'TYPESAFE_API_KEY is not set', 503)

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch(process.env.TYPESAFE_API_URL || DEFAULT_URL, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ model: process.env.TYPESAFE_MODEL || DEFAULT_MODEL, state: req.state, questions: req.questions }),
    })
  } catch (e) {
    throw new JevError('upstream', e instanceof Error && e.name === 'AbortError' ? 'Jev did not answer in 30s' : 'Cannot reach Jev')
  } finally {
    clearTimeout(timer)
  }

  if (res.status === 401 || res.status === 403) throw new JevError('unauthorized', 'Jev rejected the API key', 502)
  if (res.status === 429) throw new JevError('rate_limited', 'Jev rate limit, try again in a minute', 429)
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 300)
    throw new JevError('upstream', `Jev HTTP ${res.status}${detail ? `: ${detail}` : ''}`)
  }

  const data = (await res.json().catch(() => null)) as JevResponse | null
  if (!data?.answers) throw new JevError('bad_response', 'Unexpected answer from Jev')

  // Every option of every Choice question gets a probability; higher = more important.
  // With several questions (over 250 headlines) each question is normalised on its own.
  const ranked: RankedHeadline[] = []
  for (const key of Object.keys(req.questions)) {
    const probs = data.answers[key]?.probabilities ?? {}
    for (const [label, p] of Object.entries(probs)) {
      const it = req.byLabel[label]
      if (!it || typeof p !== 'number') continue
      ranked.push({
        id: it.id, title: it.title, link: it.link, source: it.source, feedLabel: it.feedLabel,
        pubDate: it.pubDate.toISOString(), probability: p,
      })
    }
  }
  if (ranked.length === 0) throw new JevError('bad_response', 'Jev returned no probabilities')
  ranked.sort((a, b) => b.probability - a.probability)
  return { model: data.model ?? DEFAULT_MODEL, ranked, usage: data.usage }
}
