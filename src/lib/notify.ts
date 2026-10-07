import { NewsItem, Source } from './rss'
import { ALL_SOURCES, cleanTitle } from './speech'

// Desktop notifications for new headlines (browser Notification API).
// Independent of voice; shown while the page is open in any tab.

export interface NotifySettings {
  enabled: boolean
  sources: Source[]
}

export const DEFAULT_NOTIFY_SETTINGS: NotifySettings = { enabled: false, sources: [...ALL_SOURCES] }
const KEY = 'cbt:notify-settings'
const MAX_PER_REFRESH = 3

// Unlike speech, permission survives reloads, so "enabled" is stored too
export function loadNotifySettings(): NotifySettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_NOTIFY_SETTINGS
    const v = { ...DEFAULT_NOTIFY_SETTINGS, ...JSON.parse(raw) } as NotifySettings
    v.sources = v.sources.filter((s) => ALL_SOURCES.includes(s))
    return v
  } catch {
    return DEFAULT_NOTIFY_SETTINGS
  }
}

export function saveNotifySettings(v: NotifySettings) {
  try { localStorage.setItem(KEY, JSON.stringify(v)) } catch {}
}

export function notifySupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function notifyPermission(): NotificationPermission | 'unsupported' {
  return notifySupported() ? Notification.permission : 'unsupported'
}

export async function requestNotifyPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notifySupported()) return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  return Notification.requestPermission()
}

// Same target as clicking the card: Google News links open a search for the title
export function articleUrl(item: NewsItem): string {
  if (item.link.includes('news.google.com')) {
    return `https://www.google.com/search?q=${encodeURIComponent(item.title.replace(/\s*-\s*(Bloomberg|Reuters)$/i, ''))}`
  }
  return item.link
}

function show(title: string, body: string, tag: string, url?: string) {
  try {
    const n = new Notification(title, { body, tag })
    n.onclick = () => {
      window.focus()
      if (url && /^https?:\/\//.test(url)) window.open(url, '_blank', 'noopener,noreferrer')
      n.close()
    }
  } catch (e) {
    // Android Chrome only allows notifications from a service worker
    console.warn('Notification failed:', e)
  }
}

export function testNotification() {
  if (notifySupported() && Notification.permission === 'granted') show('Hyperliquid TradFi Terminal', 'Desktop notifications are on.', 'test')
}

// `fresh` is oldest first; the newest ones get their own notification, the rest one summary
export function notifyHeadlines(fresh: NewsItem[]) {
  if (!notifySupported() || Notification.permission !== 'granted' || fresh.length === 0) return
  const head = fresh.slice(-MAX_PER_REFRESH)
  for (const it of head) show(`${it.source} · ${it.feedLabel}`, cleanTitle(it.title), it.id, it.link ? articleUrl(it) : undefined)
  const rest = fresh.length - head.length
  if (rest > 0) show('Hyperliquid TradFi Terminal', `+${rest} more new headline${rest > 1 ? 's' : ''}`, `more-${Date.now()}`)
}
