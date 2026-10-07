'use client'

import { useEffect, useRef, useState } from 'react'
import type { IChartApi, ISeriesApi } from 'lightweight-charts'
import { Instrument, INTERVALS, IntervalKey, fetchCandles, fmt } from '@/lib/market'
import s from './market.module.css'

interface Props {
  inst: Instrument | null // null = closed
  coin: string            // Hyperliquid coin key for inst (may be the alt market)
  price: number | null | undefined
  onClose: () => void
}

// Bottom sheet with a TradingView Lightweight Charts candlestick chart.
// The library is loaded on first open so it does not weigh down the page.
export default function ChartSheet({ inst, coin, price, onClose }: Props) {
  const boxRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const [interval, setInterval] = useState<IntervalKey>('1h')
  const [loading, setLoading] = useState(false)
  const open = inst != null

  // New instrument → back to 1H
  useEffect(() => { if (inst) setInterval('1h') }, [inst])

  // Lock page scroll while open, close on Escape
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [open, onClose])

  // Create the chart once, keep it sized to its box
  useEffect(() => () => { chartRef.current?.remove(); chartRef.current = null }, [])

  useEffect(() => {
    if (!inst) return
    let cancelled = false
    const cfg = INTERVALS.find((i) => i.key === interval)!
    setLoading(true)
    ;(async () => {
      try {
        if (!chartRef.current && boxRef.current) {
          const { createChart, CandlestickSeries } = await import('lightweight-charts')
          if (cancelled || !boxRef.current) return
          const box = boxRef.current
          const chart = createChart(box, {
            width: box.clientWidth,
            height: box.clientHeight,
            layout: { background: { color: '#0d0d0d' }, textColor: '#888', fontFamily: "'Share Tech Mono', monospace", fontSize: 11 },
            grid: { vertLines: { color: '#1a1a1a' }, horzLines: { color: '#1a1a1a' } },
            crosshair: { mode: 0, vertLine: { color: '#ff990066', width: 1, style: 2 }, horzLine: { color: '#ff990066', width: 1, style: 2 } },
            rightPriceScale: { borderColor: '#222', scaleMargins: { top: 0.1, bottom: 0.1 } },
            timeScale: { borderColor: '#222', timeVisible: true, secondsVisible: false, rightOffset: 7 },
            handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
            handleScale: { mouseWheel: true, pinch: true },
          })
          seriesRef.current = chart.addSeries(CandlestickSeries, {
            upColor: '#00ff88', downColor: '#ff4444', borderVisible: false, wickUpColor: '#00ff88', wickDownColor: '#ff4444',
          })
          new ResizeObserver(() => chart.resize(box.clientWidth, box.clientHeight)).observe(box)
          chartRef.current = chart
        }
        const series = seriesRef.current
        if (!series) return
        series.applyOptions({ priceFormat: { type: 'price', precision: inst.decimals, minMove: Math.pow(10, -inst.decimals) } })
        const candles = await fetchCandles(coin, cfg.key, Date.now() - cfg.ms)
        if (cancelled) return
        series.setData((Array.isArray(candles) ? candles : []).map((c) => ({
          time: Math.floor(c.t / 1000) as import('lightweight-charts').UTCTimestamp,
          open: parseFloat(c.o), high: parseFloat(c.h), low: parseFloat(c.l), close: parseFloat(c.c),
        })))
        chartRef.current?.timeScale().fitContent()
      } catch (e) {
        console.error('Chart load error:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [inst, coin, interval])

  return (
    <>
      {open && <div className={s.backdrop} onClick={onClose} />}
      <div className={`${s.sheet} ${open ? s.sheetOpen : ''}`} role="dialog" aria-modal={open} aria-hidden={!open}
        aria-label={inst ? `${inst.label} chart` : undefined}>
        <div className={s.handle} />
        <div className={s.chartHeader}>
          <div className={s.chartInfo}>
            <span className={s.chartSymbol}>{inst?.label}</span>
            <span className={s.chartPrice}>{inst ? (price != null ? fmt(price, inst.decimals) : '—') : ''}</span>
          </div>
          <div className={s.intervals}>
            {INTERVALS.map((i) => (
              <button key={i.key} className={i.key === interval ? 'active' : ''} onClick={() => setInterval(i.key)}>{i.label}</button>
            ))}
          </div>
          <button className={s.close} onClick={onClose} aria-label="Close chart">&times;</button>
        </div>
        <div className={s.chartBox} ref={boxRef}>
          {loading && <div className={s.loading}>Loading...</div>}
        </div>
      </div>
    </>
  )
}
