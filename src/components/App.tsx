'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import ShellBar, { Tab } from './ShellBar'
import Market from './market/Market'
import Terminal from './Terminal'
import { isWeekend } from '@/lib/market'

const TAB_KEY = 'cbt:tab'
const TITLE = 'Hyperliquid TradFi Terminal'

// One page, two tabs. Both stay mounted so the news feed keeps refreshing
// (and reading aloud) while MARKET is shown; the hidden one is display:none.
export default function App() {
  const [tab, setTab] = useState<Tab>('market')
  const [status, setStatus] = useState({ live: true, weekend: false })
  const [unseen, setUnseen] = useState(0) // new headlines that arrived while NEWS was not in view
  const tabRef = useRef(tab)
  useEffect(() => { tabRef.current = tab }, [tab])

  // Count resets once NEWS is on screen; the browser tab title shows the count meanwhile
  useEffect(() => {
    const reset = () => { if (tabRef.current === 'news' && document.visibilityState === 'visible') setUnseen(0) }
    reset()
    document.addEventListener('visibilitychange', reset)
    return () => document.removeEventListener('visibilitychange', reset)
  }, [tab])
  useEffect(() => { document.title = unseen ? `(${unseen}) ${TITLE}` : TITLE }, [unseen])
  const onFresh = useCallback((n: number) => {
    if (tabRef.current !== 'news' || document.visibilityState !== 'visible') setUnseen((u) => u + n)
  }, [])

  // Tab from ?tab=news, else the last one used
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('tab')
    let saved: string | null = null
    try { saved = localStorage.getItem(TAB_KEY) } catch {}
    const t = fromUrl === 'news' || fromUrl === 'market' ? fromUrl : saved === 'news' ? 'news' : 'market'
    setTab(t)
    setStatus((s) => ({ ...s, weekend: isWeekend() }))
  }, [])

  const changeTab = useCallback((t: Tab) => {
    setTab(t)
    try { localStorage.setItem(TAB_KEY, t) } catch {}
    const url = new URL(window.location.href)
    url.searchParams.set('tab', t)
    window.history.replaceState(null, '', url)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  const onStatus = useCallback((st: { live: boolean; weekend: boolean }) => setStatus(st), [])

  const bar = (variant: Tab) => (
    <ShellBar tab={tab} onTab={changeTab} live={status.live} weekend={status.weekend} newsCount={unseen}
      borderColor={variant === 'market' ? '#222' : 'var(--border-dim)'} />
  )

  return (
    <>
      <div style={{ display: tab === 'market' ? undefined : 'none' }}>
        <Market topBar={tab === 'market' ? bar('market') : null} weekend={status.weekend} onStatus={onStatus} />
      </div>
      <Terminal active={tab === 'news'} topBar={tab === 'news' ? bar('news') : null} onFresh={onFresh} />
    </>
  )
}
