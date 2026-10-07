'use client'

import '@fontsource/share-tech-mono/400.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  INSTRUMENTS, CATEGORIES, Instrument, Quote, Mids,
  fetchMids, resolvePrice, coinKey, fetchCandles, isWeekend, fridayCloseUTC, fmt, fmtPct, changePct,
} from '@/lib/market'
import ChartSheet from './ChartSheet'
import s from './market.module.css'

interface Props {
  topBar: React.ReactNode
  weekend: boolean
  onStatus: (status: { live: boolean; weekend: boolean }) => void
}

const MIDS_EVERY = 10_000
const CANDLES_EVERY = 300_000
const OFFLINE_AFTER = 30_000

// MARKET tab: TradFi quotes from Hyperliquid (indices, commodities, FX) plus BTC / ETH.
export default function Market({ topBar, weekend, onStatus }: Props) {
  const [quotes, setQuotes] = useState<Record<string, Quote>>({})
  const [chartInst, setChartInst] = useState<Instrument | null>(null)
  const [flash, setFlash] = useState(false)
  const mids = useRef<Mids>({ main: {}, xyz: {}, cash: {} })
  const useAlt = useRef<Record<string, boolean>>({})
  const lastOk = useRef(0)
  const cardRef = useRef<HTMLDivElement>(null)
  const closeChart = useCallback(() => setChartInst(null), [])

  const patch = (id: string, q: Partial<Quote>) => setQuotes((prev) => ({ ...prev, [id]: { ...prev[id], ...q } }))
  const coin = (inst: Instrument) => coinKey(inst, !!useAlt.current[inst.id])

  const loadMids = useCallback(async () => {
    try {
      const next = await fetchMids(mids.current)
      if (!next) throw new Error('all dexes failed')
      mids.current = next
      lastOk.current = Date.now()
      setQuotes((prev) => {
        const out = { ...prev }
        for (const inst of INSTRUMENTS) {
          const { price, useAlt: alt } = resolvePrice(next, inst)
          useAlt.current[inst.id] = alt
          // Keep a candle-based price if mids have none for this instrument
          out[inst.id] = { ...prev[inst.id], price: price ?? prev[inst.id]?.price ?? null }
        }
        return out
      })
    } catch (e) {
      console.error('allMids error:', e)
    }
  }, [])

  const loadDaily = useCallback(async () => {
    await Promise.allSettled(INSTRUMENTS.map(async (inst) => {
      const now = Date.now()
      const candles = await fetchCandles(coin(inst), '1d', now - 2 * 86400_000, now)
      const last = candles?.[candles.length - 1]
      if (!last) return
      setQuotes((prev) => ({ ...prev, [inst.id]: {
        ...prev[inst.id],
        dayOpen: parseFloat(last.o), dayHigh: parseFloat(last.h), dayLow: parseFloat(last.l),
        price: prev[inst.id]?.price ?? parseFloat(last.c), // fallback when allMids has no price
      } }))
    }))
  }, [])

  const loadWeekend = useCallback(async () => {
    const from = fridayCloseUTC()
    if (!isWeekend() || from == null) return
    await Promise.allSettled(INSTRUMENTS.map(async (inst) => {
      const candles = await fetchCandles(coin(inst), '1h', from)
      if (!candles?.length) return
      let hi = -Infinity, lo = Infinity
      for (const c of candles) { hi = Math.max(hi, parseFloat(c.h)); lo = Math.min(lo, parseFloat(c.l)) }
      setQuotes((prev) => ({ ...prev, [inst.id]: {
        ...prev[inst.id], wkdHigh: hi, wkdLow: lo,
        price: prev[inst.id]?.price ?? parseFloat(candles[candles.length - 1].c),
        dayOpen: prev[inst.id]?.dayOpen ?? parseFloat(candles[0].o),
      } }))
    }))
  }, [])

  // Polling: mids every 10s, daily and weekend candles every 5 min
  useEffect(() => {
    let alive = true
    ;(async () => { await loadMids(); if (alive) await Promise.all([loadDaily(), loadWeekend()]) })()
    const a = setInterval(loadMids, MIDS_EVERY)
    const b = setInterval(() => { loadDaily(); loadWeekend() }, CANDLES_EVERY)
    return () => { alive = false; clearInterval(a); clearInterval(b) }
  }, [loadMids, loadDaily, loadWeekend])

  // Live / weekend status for the top bar, checked every second
  const lastStatus = useRef('')
  useEffect(() => {
    if (!lastOk.current) lastOk.current = Date.now() // 30s grace before OFFLINE on first load
    const tick = () => {
      const st = { live: Date.now() - lastOk.current <= OFFLINE_AFTER, weekend: isWeekend() }
      const key = `${st.live}|${st.weekend}`
      if (key !== lastStatus.current) { lastStatus.current = key; onStatus(st) }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [onStatus])

  // Weekend starts → fetch the ranges right away
  useEffect(() => { if (weekend) loadWeekend() }, [weekend, loadWeekend])

  async function screenshot() {
    const el = cardRef.current
    if (!el) return
    setFlash(true); setTimeout(() => setFlash(false), 300)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(el, {
        backgroundColor: '#0a0a0a',
        scale: 2,
        // Shared image: full title and date, no tab buttons, even on phones
        onclone: (doc) => doc.querySelector('[data-capture-root]')?.setAttribute('data-capturing', ''),
      })
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'))
      if (!blob) return
      const filename = `hyperliquid-terminal-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.png`
      const file = new File([blob], filename, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file], title: 'Hyperliquid Terminal' }); return }
        catch (e) { if ((e as Error).name === 'AbortError') return } // cancelled: do not download
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = filename; a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) {
      console.error('Screenshot error:', e)
    }
  }

  const cell = (v: number | undefined, d: number) => (v != null ? fmt(v, d) : <span className={s.na}>—</span>)

  return (
    <div className={s.page}>
      <div ref={cardRef} className={`${s.container} ${flash ? s.flash : ''}`} data-capture-root>
        {topBar}
        <div className={s.tableWrapper}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>INSTRUMENT</th><th>PRICE</th><th>CHG %</th>
                <th>{weekend ? 'WKD LOW' : 'DAY LOW'}</th><th>{weekend ? 'WKD HIGH' : 'DAY HIGH'}</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map((cat) => (
                <Rows key={cat} cat={cat} quotes={quotes} weekend={weekend} cell={cell} onOpen={setChartInst} />
              ))}
            </tbody>
          </table>
        </div>
        <div className={s.footer}>
          Source: Hyperliquid HIP-3 (xyz/cash) · Perps mid-price · <span className={s.footerNote}>NOT financial advice</span>
        </div>
      </div>
      <button className={s.screenshotBtn} onClick={screenshot}>📸 SCREENSHOT</button>

      <ChartSheet inst={chartInst} coin={chartInst ? coin(chartInst) : ''}
        price={chartInst ? quotes[chartInst.id]?.price : null} onClose={closeChart} />
    </div>
  )
}

function Rows({ cat, quotes, weekend, cell, onOpen }: {
  cat: string; quotes: Record<string, Quote>; weekend: boolean
  cell: (v: number | undefined, d: number) => React.ReactNode; onOpen: (i: Instrument) => void
}) {
  const items = INSTRUMENTS.filter((i) => i.category === cat)
  return (
    <>
      <tr className={s.catRow}><td colSpan={5}>── {cat} ──</td></tr>
      {items.map((inst) => {
        const q = quotes[inst.id] ?? {}
        const pct = changePct(q)
        const cls = pct == null ? s.na : pct > 0 ? s.positive : pct < 0 ? s.negative : s.neutral
        return (
          <tr key={inst.id} className={s.dataRow} tabIndex={0} title={`${inst.label} chart`}
            onClick={() => onOpen(inst)} onKeyDown={(e) => { if (e.key === 'Enter') onOpen(inst) }}>
            <td className={s.name}>{inst.label}</td>
            <td>{q.price != null ? fmt(q.price, inst.decimals) : <span className={s.na}>N/A</span>}</td>
            <td className={cls}>{fmtPct(pct)}</td>
            <td>{cell(weekend ? q.wkdLow : q.dayLow, inst.decimals)}</td>
            <td>{cell(weekend ? q.wkdHigh : q.dayHigh, inst.decimals)}</td>
          </tr>
        )
      })}
    </>
  )
}
