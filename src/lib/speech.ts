import { NewsItem, Source } from './rss'

// Text-to-speech for new headlines, using the browser's built-in Web Speech API.
// Nothing is sent to a server; available voices depend on the OS / browser.

export const ALL_SOURCES: Source[] = ['FED', 'ECB', 'NBP', 'REUTERS', 'BLOOMBERG', 'STOOQ', 'AXIOS']
const POLISH_SOURCES: Source[] = ['NBP', 'STOOQ']

const SPOKEN_NAME: Record<Source, string> = {
  FED: 'Fed', ECB: 'ECB', NBP: 'NBP', REUTERS: 'Reuters', BLOOMBERG: 'Bloomberg', STOOQ: 'Stooq', AXIOS: 'Axios',
}

export interface VoiceSettings {
  sources: Source[]
  voiceEn: string // voiceURI, '' = automatic
  voicePl: string
  rate: number
  maxPerRefresh: number
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  sources: [...ALL_SOURCES],
  voiceEn: '',
  voicePl: '',
  rate: 1,
  maxPerRefresh: 3,
}

const KEY = 'cbt:voice-settings'

// The on/off switch itself is not stored: browsers only allow speech after a
// click on the page, so it has to be switched on again after a reload.
export function loadVoiceSettings(): VoiceSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_VOICE_SETTINGS
    const v = { ...DEFAULT_VOICE_SETTINGS, ...JSON.parse(raw) } as VoiceSettings
    v.sources = v.sources.filter((s) => ALL_SOURCES.includes(s))
    return v
  } catch {
    return DEFAULT_VOICE_SETTINGS
  }
}

export function saveVoiceSettings(v: VoiceSettings) {
  try { localStorage.setItem(KEY, JSON.stringify(v)) } catch {}
}

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
}

export type Lang = 'en' | 'pl'
export const langOf = (source: Source): Lang => (POLISH_SOURCES.includes(source) ? 'pl' : 'en')

export function voicesFor(voices: SpeechSynthesisVoice[], lang: Lang): SpeechSynthesisVoice[] {
  return voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith(lang))
}

// Prefer natural/online voices (Edge "Natural", Chrome "Google"), then the default one
function autoVoice(voices: SpeechSynthesisVoice[], lang: Lang): SpeechSynthesisVoice | undefined {
  const list = voicesFor(voices, lang)
  const rank = (v: SpeechSynthesisVoice) =>
    (/natural|online/i.test(v.name) ? 4 : 0) + (/google/i.test(v.name) ? 2 : 0) +
    (lang === 'en' && /en-us/i.test(v.lang) ? 1 : 0) + (v.default ? 0.5 : 0)
  return [...list].sort((a, b) => rank(b) - rank(a))[0]
}

export function pickVoice(voices: SpeechSynthesisVoice[], lang: Lang, uri: string): SpeechSynthesisVoice | undefined {
  return (uri && voices.find((v) => v.voiceURI === uri)) || autoVoice(voices, lang)
}

// Remove "- Bloomberg" / "- Reuters" style suffixes added by Google News feeds
export function cleanTitle(title: string): string {
  return title.replace(/\s+[-–|]\s+(Bloomberg|Reuters|Axios|Stooq(\.pl)?)\s*$/i, '').trim()
}

export function speak(text: string, lang: Lang, settings: VoiceSettings, voices: SpeechSynthesisVoice[]) {
  if (!speechSupported()) return
  const u = new SpeechSynthesisUtterance(text)
  const voice = pickVoice(voices, lang, lang === 'pl' ? settings.voicePl : settings.voiceEn)
  if (voice) u.voice = voice
  u.lang = voice?.lang ?? (lang === 'pl' ? 'pl-PL' : 'en-US')
  u.rate = settings.rate
  window.speechSynthesis.speak(u) // the browser queues utterances itself
}

export function stopSpeaking() {
  if (speechSupported()) window.speechSynthesis.cancel()
}

// New = not seen in the previous fetch, from a selected source, published in
// the last hour (feeds sometimes re-surface old items with a new id).
export function newHeadlines(fetched: NewsItem[], seen: Set<string>, settings: VoiceSettings, now = Date.now()): NewsItem[] {
  return fetched
    .filter((i) => !seen.has(i.id) && settings.sources.includes(i.source) && now - i.pubDate.getTime() < 3600_000)
    .sort((a, b) => a.pubDate.getTime() - b.pubDate.getTime()) // oldest first, in the order they arrived
}

export function announce(fresh: NewsItem[], settings: VoiceSettings, voices: SpeechSynthesisVoice[]) {
  // Over the limit: read the newest ones (still in the order they arrived), sum up the rest
  const head = fresh.slice(-settings.maxPerRefresh)
  for (const it of head) speak(`${SPOKEN_NAME[it.source]}: ${cleanTitle(it.title)}`, langOf(it.source), settings, voices)
  const rest = fresh.length - head.length
  if (rest > 0) {
    const pl = voicesFor(voices, 'pl').length > 0
    speak(pl ? `I jeszcze ${rest} ${plural(rest)}.` : `And ${rest} more.`, pl ? 'pl' : 'en', settings, voices)
  }
}

function plural(n: number): string {
  const d = n % 10, t = n % 100
  if (n === 1) return 'nowy news'
  if (d >= 2 && d <= 4 && (t < 12 || t > 14)) return 'nowe newsy'
  return 'nowych newsów'
}
