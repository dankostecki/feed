import { NextResponse } from 'next/server'
import { loadAllItems } from '@/lib/rssServer'
import { FEEDS } from '@/lib/feeds'
import { buildJevRequest } from '@/lib/jevExport'
import { rankWithJev, JevError, RankedHeadline } from '@/lib/jevApi'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const WINDOWS = [4, 8, 24]
const TOP = 15
const CACHE_S = 300 // a ranking is reused for 5 min: repeated clicks or other visitors do not trigger new upstream calls

interface Ranking { hours: number; generatedAt: string; count: number; top: RankedHeadline[] }
// The whole ranking of a window is kept; ?exclude only filters it afterwards, so it never causes another upstream call
const memo = new Map<number, { at: number; generatedAt: string; ranked: RankedHeadline[] }>()
const SOURCES = new Set(FEEDS.map((f) => f.source))

// GET /api/top?hours=4|8|24 → top headlines of that window, ranked server-side (TypeSafe Jev).
// The server builds the request from its own RSS fetch, so callers cannot make it
// spend credits on arbitrary text; only ?hours and ?exclude (known source names, applied to
// the finished ranking) are accepted (no cache-busting params).
// Public responses never name the upstream service; details go to the server log only.
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams
  const hours = Number(params.get('hours'))
  const exclude = (params.get('exclude') ?? '').split(',').filter(Boolean)
  if (!WINDOWS.includes(hours) || [...params.keys()].some((k) => k !== 'hours' && k !== 'exclude') || exclude.some((s) => !SOURCES.has(s))) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
  }
  const view = (c: { generatedAt: string; ranked: RankedHeadline[] }): Ranking => {
    const ranked = c.ranked.filter((r) => !exclude.includes(r.source))
    return { hours, generatedAt: c.generatedAt, count: ranked.length, top: ranked.slice(0, TOP) }
  }

  const hit = memo.get(hours)
  if (hit && Date.now() - hit.at < CACHE_S * 1000) return ok(view(hit), CACHE_S - Math.floor((Date.now() - hit.at) / 1000))

  try {
    const now = new Date()
    const jevReq = buildJevRequest(await loadAllItems(), hours, now)
    const ranked = jevReq.count === 0 ? [] : (await rankWithJev(jevReq)).ranked
    const entry = { at: Date.now(), generatedAt: now.toISOString(), ranked }
    memo.set(hours, entry)
    return ok(view(entry), CACHE_S)
  } catch (e) {
    const err = e instanceof JevError ? e : new JevError('upstream', e instanceof Error ? e.message : 'Unknown error')
    console.error('top news ranking failed:', err.code, err.message)
    const code = err.code === 'rate_limited' ? 'busy' : 'unavailable'
    return NextResponse.json({ error: code }, { status: err.code === 'rate_limited' ? 429 : 503, headers: { 'Cache-Control': 'no-store' } })
  }
}

function ok(data: Ranking, maxAge: number) {
  return NextResponse.json(data, {
    headers: { 'Cache-Control': `public, max-age=0, s-maxage=${Math.max(1, maxAge)}, stale-while-revalidate=60` },
  })
}
