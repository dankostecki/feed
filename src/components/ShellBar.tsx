'use client'

import { useEffect, useState } from 'react'

export type Tab = 'market' | 'news'

interface Props {
  tab: Tab
  onTab: (t: Tab) => void
  live: boolean     // Hyperliquid data fresh (last fetch < 30s)
  weekend: boolean
  borderColor: string
}

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const pad = (n: number) => String(n).padStart(2, '0')

function Clock() {
  const [now, setNow] = useState<Date | null>(null) // null on the server: avoids a hydration mismatch
  useEffect(() => { setNow(new Date()); const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id) }, [])
  if (!now) return null
  return (
    <span className="tabular-nums" style={{ color: '#4488ff' }}>
      <span className="hidden sm:inline" data-capture-show>{DAYS[now.getUTCDay()]} </span>
      {pad(now.getUTCHours())}:{pad(now.getUTCMinutes())}:{pad(now.getUTCSeconds())}
      <span className="hidden sm:inline" data-capture-show> UTC</span>
    </span>
  )
}

// App-wide top bar: title, MARKET / NEWS tabs, live status and UTC clock.
// Plain hex colours (no Tailwind colour utilities) so html2canvas renders it in screenshots.
export default function ShellBar({ tab, onTab, live, weekend, borderColor }: Props) {
  const tabBtn = (t: Tab, label: string) => {
    const active = tab === t
    return (
      <button key={t} role="tab" aria-selected={active} onClick={() => onTab(t)}
        className="text-[12px] tracking-[1.5px] px-2.5 sm:px-3 min-h-[34px] sm:min-h-[30px] rounded-sm border transition-colors"
        style={active
          ? { color: '#ff9900', borderColor: 'rgba(255,153,0,0.55)', backgroundColor: 'rgba(255,153,0,0.10)' }
          : { color: '#888888', borderColor: '#333333', backgroundColor: 'transparent' }}>
        {label}
      </button>
    )
  }

  return (
    <div data-capture-wrap className="flex items-center justify-between gap-2 sm:gap-3 px-2.5 sm:px-4 py-2 sm:py-3 flex-nowrap"
      style={{ borderBottom: `1px solid ${borderColor}`, fontFamily: "'Share Tech Mono', 'Consolas', monospace" }}>
      <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
        <span className="font-semibold tracking-[1px] whitespace-nowrap text-[12px] sm:text-[15px]" style={{ color: '#ff9900' }}>
          <span className="hidden sm:inline" data-capture-show>HYPERLIQUID TRADFI TERMINAL</span>
          <span className="sm:hidden" data-capture-hide>HL TRADFI</span>
        </span>
        <div className="flex gap-1.5" role="tablist" data-capture-hide>
          {tabBtn('market', 'MARKET')}
          {tabBtn('news', 'NEWS')}
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3.5 text-[12px] shrink-0">
        <span className="flex items-center gap-1.5" title={live ? 'Hyperliquid data is live' : 'No Hyperliquid data for over 30s'}>
          <span className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: live ? '#00ff88' : '#ff4444', animation: 'pulse 1.5s ease-in-out infinite' }} />
          <span className="hidden sm:inline" data-capture-show style={{ color: live ? '#00ff88' : '#ff4444' }}>{live ? 'LIVE' : 'OFFLINE'}</span>
        </span>
        <Clock />
        {weekend && (
          <span className="font-semibold px-1.5 py-px rounded-[3px] border" style={{ color: '#ff9900', borderColor: '#ff9900' }}
            title="Weekend: TradFi markets closed, ranges since Friday 22:00 UTC">
            ⚠<span className="hidden sm:inline" data-capture-show> WEEKEND</span>
          </span>
        )}
      </div>
    </div>
  )
}
