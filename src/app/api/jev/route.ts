import { NextResponse } from 'next/server'
import { loadAllItems } from '@/lib/rssServer'
import { buildJevRequest } from '@/lib/jevExport'
import { rankWithJev, JevError, RankedHeadline } from '@/lib/jevApi'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const WINDOWS = [4, 8, 24]
const TOP = 15
const CACHE_S = 300 // a ranking is reused for 5 min: repeated clicks or other visitors do not cost Jev calls

interface Ranking { hours: number; generatedAt: string; count: number; model: string; top: RankedHeadline[] }
const memo = new Map<number, { at: number; data: Ranking }>()

// GET /api/jev?hours=4|8|24 → top headlines of that window ranked by Jev.
// The server builds the request from its own RSS fetch, so callers cannot make it
// spend Jev credits on arbitrary text; only ?hours is accepted (no cache-busting params).
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams
  const hours = Number(params.get('hours'))
  if (!WINDOWS.includes(hours) || [...params.keys()].some((k) => k !== 'hours')) {
    return NextResponse.json({ error: 'bad_request', message: 'Use ?hours=4, 8 or 24' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
  }

  const hit = memo.get(hours)
  if (hit && Date.now() - hit.at < CACHE_S * 1000) return ok(hit.data, CACHE_S - Math.floor((Date.now() - hit.at) / 1000))

  try {
    const now = new Date()
    const jevReq = buildJevRequest(await loadAllItems(), hours, now)
    let data: Ranking
    if (jevReq.count === 0) {
      data = { hours, generatedAt: now.toISOString(), count: 0, model: '', top: [] }
    } else {
      const { model, ranked } = await rankWithJev(jevReq)
      data = { hours, generatedAt: now.toISOString(), count: jevReq.count, model, top: ranked.slice(0, TOP) }
    }
    memo.set(hours, { at: Date.now(), data })
    return ok(data, CACHE_S)
  } catch (e) {
    const err = e instanceof JevError ? e : new JevError('upstream', e instanceof Error ? e.message : 'Unknown error')
    console.error('jev ranking failed:', err.code, err.message)
    return NextResponse.json({ error: err.code, message: err.message }, { status: err.status, headers: { 'Cache-Control': 'no-store' } })
  }
}

function ok(data: Ranking, maxAge: number) {
  return NextResponse.json(data, {
    headers: { 'Cache-Control': `public, max-age=0, s-maxage=${Math.max(1, maxAge)}, stale-while-revalidate=60` },
  })
}
