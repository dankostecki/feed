import { Source } from './rss'

// Polskie źródła — czytamy po polsku, reszta po angielsku
const POLISH_SOURCES: Source[] = ['STOOQ', 'NBP']

export function langFor(source: Source): string {
  return POLISH_SOURCES.includes(source) ? 'pl-PL' : 'en-US'
}

export function isTTSSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function speak(text: string, lang: string): void {
  if (!isTTSSupported()) return
  const trimmed = text.length > 200 ? text.slice(0, 200) + '…' : text
  const u = new SpeechSynthesisUtterance(trimmed)
  u.lang = lang
  u.rate = 1.0
  u.pitch = 1.0
  u.volume = 1.0
  window.speechSynthesis.speak(u)
}

export function cancelAll(): void {
  if (isTTSSupported()) window.speechSynthesis.cancel()
}
