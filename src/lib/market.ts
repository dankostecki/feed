// Hyperliquid market data for the MARKET tab: public API, no key, called from the browser.

export type Category = 'INDEX' | 'CMDTY' | 'FX' | 'CRYPTO'
type Dex = '' | 'xyz' | 'cash'

export interface Instrument {
  id: string
  dex: Dex // '' = main dex (crypto), 'xyz' / 'cash' = HIP-3 dexes
  label: string
  category: Category
  decimals: number
  alt?: { dex: Exclude<Dex, ''>; id: string } // fallback market if the primary one is missing
}

export const INSTRUMENTS: Instrument[] = [
  { id: 'XYZ100',   dex: 'xyz', label: 'NDX100',  category: 'INDEX',  decimals: 1 },
  { id: 'SP500',    dex: 'xyz', label: 'S&P 500', category: 'INDEX',  decimals: 1, alt: { dex: 'cash', id: 'USA500' } },
  { id: 'CL',       dex: 'xyz', label: 'WTI OIL', category: 'CMDTY',  decimals: 2 },
  { id: 'BRENTOIL', dex: 'xyz', label: 'BRENT',   category: 'CMDTY',  decimals: 2 },
  { id: 'GOLD',     dex: 'xyz', label: 'GOLD',    category: 'CMDTY',  decimals: 1 },
  { id: 'SILVER',   dex: 'xyz', label: 'SILVER',  category: 'CMDTY',  decimals: 2 },
  { id: 'NATGAS',   dex: 'xyz', label: 'NAT GAS', category: 'CMDTY',  decimals: 3 },
  { id: 'COPPER',   dex: 'xyz', label: 'COPPER',  category: 'CMDTY',  decimals: 3 },
  { id: 'EUR',      dex: 'xyz', label: 'EUR/USD', category: 'FX',     decimals: 4 },
  { id: 'JPY',      dex: 'xyz', label: 'USD/JPY', category: 'FX',     decimals: 2 },
  { id: 'BTC',      dex: '',    label: 'BTC',     category: 'CRYPTO', decimals: 1 },
  { id: 'ETH',      dex: '',    label: 'ETH',     category: 'CRYPTO', decimals: 2 },
]

export const CATEGORIES: Category[] = ['INDEX', 'CMDTY', 'FX', 'CRYPTO']

export interface Quote {
  price?: number | null
  dayOpen?: number
  dayLow?: number
  dayHigh?: number
  wkdLow?: number
  wkdHigh?: number
}

export interface Candle { t: number; o: string; h: string; l: string; c: string }

const API = 'https://api.hyperliquid.xyz/info'

export async function postAPI<T>(body: unknown): Promise<T> {
  const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json() as Promise<T>
}

export type Mids = Record<'main' | 'xyz' | 'cash', Record<string, string>>

// allSettled: one failing dex must not wipe prices from the others.
// Returns null when every dex failed (the previous mids are kept by the caller).
export async function fetchMids(prev: Mids): Promise<Mids | null> {
  const [main, xyz, cash] = await Promise.allSettled([
    postAPI<Record<string, string>>({ type: 'allMids' }),
    postAPI<Record<string, string>>({ type: 'allMids', dex: 'xyz' }),
    postAPI<Record<string, string>>({ type: 'allMids', dex: 'cash' }),
  ])
  if (main.status === 'rejected' && xyz.status === 'rejected' && cash.status === 'rejected') return null
  return {
    main: main.status === 'fulfilled' ? main.value : prev.main,
    xyz:  xyz.status === 'fulfilled' ? xyz.value : prev.xyz,
    cash: cash.status === 'fulfilled' ? cash.value : prev.cash,
  }
}

// HIP-3 dexes: try the known key formats ("CL", "xyz:CL")
function lookupMid(mids: Mids, dex: Exclude<Dex, ''>, id: string): string | null {
  const src = mids[dex] || {}
  return src[id] ?? src[`${dex}:${id}`] ?? src[id.toUpperCase()] ?? null
}

// Price for an instrument plus whether its alternative market was used
export function resolvePrice(mids: Mids, inst: Instrument): { price: number | null; useAlt: boolean } {
  if (inst.dex === '') {
    const raw = mids.main[inst.id]
    return { price: raw != null ? parseFloat(raw) : null, useAlt: false }
  }
  let raw = lookupMid(mids, inst.dex, inst.id)
  if (raw == null) raw = lookupMid(mids, inst.dex === 'xyz' ? 'cash' : 'xyz', inst.id) // same ticker, other dex
  if (raw == null && inst.alt) {
    const alt = lookupMid(mids, inst.alt.dex, inst.alt.id)
    if (alt != null) return { price: parseFloat(alt), useAlt: true }
  }
  return { price: raw != null ? parseFloat(raw) : null, useAlt: false }
}

export function coinKey(inst: Instrument, useAlt: boolean): string {
  if (useAlt && inst.alt) return `${inst.alt.dex}:${inst.alt.id}`
  return inst.dex ? `${inst.dex}:${inst.id}` : inst.id
}

export function fetchCandles(coin: string, interval: string, startTime: number, endTime = Date.now()) {
  return postAPI<Candle[]>({ type: 'candleSnapshot', req: { coin, interval, startTime, endTime } })
}

// Weekend: Friday 22:00 UTC → Sunday 23:00 UTC (TradFi markets closed)
export function isWeekend(now = new Date()): boolean {
  const day = now.getUTCDay(), hour = now.getUTCHours()
  return day === 6 || (day === 0 && hour < 23) || (day === 5 && hour >= 22)
}

export function fridayCloseUTC(now = new Date()): number | null {
  const day = now.getUTCDay()
  const back = day === 0 ? 2 : day === 6 ? 1 : day === 5 ? 0 : null
  if (back == null) return null
  const f = new Date(now)
  f.setUTCDate(f.getUTCDate() - back)
  f.setUTCHours(22, 0, 0, 0)
  return f.getTime()
}

export function fmt(val: number | null | undefined, decimals: number): string {
  if (val == null || isNaN(val)) return 'N/A'
  return val.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export function fmtPct(val: number | null): string {
  if (val == null || isNaN(val)) return 'N/A'
  return (val > 0 ? '+' : '') + val.toFixed(2) + '%'
}

export function changePct(q: Quote): number | null {
  if (q.price == null || q.dayOpen == null || !q.dayOpen) return null
  return ((q.price - q.dayOpen) / q.dayOpen) * 100
}

// Chart intervals → how far back to fetch so zooming out does not run out of data
export const INTERVALS = [
  { key: '1m',  label: '1m',  ms: 12 * 3600_000 },
  { key: '5m',  label: '5m',  ms: 2 * 86400_000 },
  { key: '15m', label: '15m', ms: 7 * 86400_000 },
  { key: '1h',  label: '1H',  ms: 30 * 86400_000 },
  { key: '4h',  label: '4H',  ms: 90 * 86400_000 },
  { key: '1d',  label: '1D',  ms: 365 * 86400_000 },
] as const
export type IntervalKey = typeof INTERVALS[number]['key']
