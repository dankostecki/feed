export interface FeedMeta {
  color: string   // CSS var — resolves to neon (dark) or deep (light)
  bg: string      // CSS var — translucent background for tag
  border: string  // CSS var — translucent border for tag
  symbol: string
  label: string
  source: 'FED' | 'ECB' | 'NBP' | 'REUTERS' | 'BLOOMBERG'
}

export const FEED_META: Record<string, FeedMeta> = {
  'FED::PRESS':  { color: 'var(--feed-fed-press)',  bg: 'var(--feed-fed-press-bg)',  border: 'var(--feed-fed-press-bd)',  symbol: '◉', label: 'FED · PRESS',  source: 'FED' },
  'FED::SPEECH': { color: 'var(--feed-fed-speech)', bg: 'var(--feed-fed-speech-bg)', border: 'var(--feed-fed-speech-bd)', symbol: '◎', label: 'FED · SPEECH', source: 'FED' },
  'FED::FOMC':   { color: 'var(--feed-fed-fomc)',   bg: 'var(--feed-fed-fomc-bg)',   border: 'var(--feed-fed-fomc-bd)',   symbol: '◆', label: 'FED · FOMC',   source: 'FED' },
  'FED::POLICY': { color: 'var(--feed-fed-policy)', bg: 'var(--feed-fed-policy-bg)', border: 'var(--feed-fed-policy-bd)', symbol: '▷', label: 'FED · POLICY', source: 'FED' },
  'FED::NOTES':  { color: 'var(--feed-fed-notes)',  bg: 'var(--feed-fed-notes-bg)',  border: 'var(--feed-fed-notes-bd)',  symbol: '▣', label: 'FED · NOTES',  source: 'FED' },
  'ECB::PRESS':  { color: 'var(--feed-ecb-press)',  bg: 'var(--feed-ecb-press-bg)',  border: 'var(--feed-ecb-press-bd)',  symbol: '◉', label: 'ECB · PRESS',  source: 'ECB' },
  'ECB::SPEECH': { color: 'var(--feed-ecb-speech)', bg: 'var(--feed-ecb-speech-bg)', border: 'var(--feed-ecb-speech-bd)', symbol: '◎', label: 'ECB · SPEECH', source: 'ECB' },
  'ECB::BLOG':   { color: 'var(--feed-ecb-blog)',   bg: 'var(--feed-ecb-blog-bg)',   border: 'var(--feed-ecb-blog-bd)',   symbol: '◈', label: 'ECB · BLOG',   source: 'ECB' },
  'ECB::PUB':    { color: 'var(--feed-ecb-pub)',    bg: 'var(--feed-ecb-pub-bg)',    border: 'var(--feed-ecb-pub-bd)',    symbol: '▣', label: 'ECB · PUB',    source: 'ECB' },
  'NBP::NEWS':       { color: 'var(--feed-nbp-news)',       bg: 'var(--feed-nbp-news-bg)',       border: 'var(--feed-nbp-news-bd)',       symbol: '●', label: 'NBP · NEWS',       source: 'NBP' },
  'REUTERS::MARKETS':  { color: 'var(--feed-reuters-markets)',  bg: 'var(--feed-reuters-markets-bg)',  border: 'var(--feed-reuters-markets-bd)',  symbol: '◉', label: 'REUTERS · MARKETS',  source: 'REUTERS' },
  'REUTERS::BUSINESS': { color: 'var(--feed-reuters-business)', bg: 'var(--feed-reuters-business-bg)', border: 'var(--feed-reuters-business-bd)', symbol: '◎', label: 'REUTERS · BUSINESS', source: 'REUTERS' },
  'REUTERS::WORLD':    { color: 'var(--feed-reuters-world)',    bg: 'var(--feed-reuters-world-bg)',    border: 'var(--feed-reuters-world-bd)',    symbol: '◆', label: 'REUTERS · WORLD',    source: 'REUTERS' },
  'BLOOMBERG::MARKETS':   { color: 'var(--feed-bloomberg-markets)',   bg: 'var(--feed-bloomberg-markets-bg)',   border: 'var(--feed-bloomberg-markets-bd)',   symbol: '◉', label: 'BLOOMBERG · MARKETS',   source: 'BLOOMBERG' },
  'BLOOMBERG::ECONOMICS': { color: 'var(--feed-bloomberg-economics)', bg: 'var(--feed-bloomberg-economics-bg)', border: 'var(--feed-bloomberg-economics-bd)', symbol: '◎', label: 'BLOOMBERG · ECONOMICS', source: 'BLOOMBERG' },
  'BLOOMBERG::POLITICS':  { color: 'var(--feed-bloomberg-politics)',  bg: 'var(--feed-bloomberg-politics-bg)',  border: 'var(--feed-bloomberg-politics-bd)',  symbol: '◆', label: 'BLOOMBERG · POLITICS',  source: 'BLOOMBERG' },
}

export const SOURCE_SUBFEEDS: Record<string, string[]> = {
  FED: ['PRESS', 'SPEECH', 'FOMC', 'POLICY', 'NOTES'],
  ECB: ['PRESS', 'SPEECH', 'BLOG', 'PUB'],
  NBP: ['NEWS'],
  REUTERS: ['MARKETS', 'BUSINESS', 'WORLD'],
  BLOOMBERG: ['MARKETS', 'ECONOMICS', 'POLITICS'],
}

// All return CSS vars — resolved correctly for dark AND light by the browser
export const SOURCE_COLOR: Record<string, string> = {
  FED: 'var(--src-FED)',
  ECB: 'var(--src-ECB)',
  NBP: 'var(--src-NBP)',
  REUTERS: 'var(--src-REUTERS)',
  BLOOMBERG: 'var(--src-BLOOMBERG)',
}

export const SOURCE_BG: Record<string, string> = {
  FED: 'var(--src-FED-bg)',
  ECB: 'var(--src-ECB-bg)',
  NBP: 'var(--src-NBP-bg)',
  REUTERS: 'var(--src-REUTERS-bg)',
  BLOOMBERG: 'var(--src-BLOOMBERG-bg)',
}

export const SOURCE_BD: Record<string, string> = {
  FED: 'var(--src-FED-bd)',
  ECB: 'var(--src-ECB-bd)',
  NBP: 'var(--src-NBP-bd)',
  REUTERS: 'var(--src-REUTERS-bd)',
  BLOOMBERG: 'var(--src-BLOOMBERG-bd)',
}

export function getFeedMeta(source: string, feedLabel: string): FeedMeta {
  return (
    FEED_META[`${source}::${feedLabel}`] ?? {
      color: 'var(--text-ui)',
      bg: 'rgba(107,114,128,0.10)',
      border: 'rgba(107,114,128,0.25)',
      symbol: '○',
      label: `${source} · ${feedLabel}`,
      source: source as 'FED' | 'ECB' | 'NBP' | 'REUTERS' | 'BLOOMBERG',
    }
  )
}
