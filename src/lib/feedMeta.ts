export interface FeedMeta {
  color: string   // hex accent color unique to this feed stream
  symbol: string  // unicode shape for quick visual recognition
  label: string   // short display label
  bg: string      // translucent bg for tags
  source: 'FED' | 'ECB' | 'NBP'
}

// 9 distinct visual identities — warm spectrum for FED, cool for ECB, green for NBP
export const FEED_META: Record<string, FeedMeta> = {
  // FED — amber / orange / red / yellow
  'FED::PRESS':   { color: '#f59e0b', symbol: '◉', label: 'FED · PRESS',   bg: 'rgba(245,158,11,0.10)',   source: 'FED' },
  'FED::SPEECH':  { color: '#fb923c', symbol: '◎', label: 'FED · SPEECH',  bg: 'rgba(251,146,60,0.10)',   source: 'FED' },
  'FED::FOMC':    { color: '#f87171', symbol: '◆', label: 'FED · FOMC',    bg: 'rgba(248,113,113,0.10)',  source: 'FED' },
  'FED::POLICY':  { color: '#fde047', symbol: '▷', label: 'FED · POLICY',  bg: 'rgba(253,224,71,0.10)',   source: 'FED' },

  // ECB — sky / indigo / violet / cyan
  'ECB::PRESS':   { color: '#38bdf8', symbol: '◉', label: 'ECB · PRESS',   bg: 'rgba(56,189,248,0.10)',   source: 'ECB' },
  'ECB::SPEECH':  { color: '#818cf8', symbol: '◎', label: 'ECB · SPEECH',  bg: 'rgba(129,140,248,0.10)',  source: 'ECB' },
  'ECB::BLOG':    { color: '#a78bfa', symbol: '◈', label: 'ECB · BLOG',    bg: 'rgba(167,139,250,0.10)',  source: 'ECB' },
  'ECB::PUB':     { color: '#22d3ee', symbol: '▣', label: 'ECB · PUB',     bg: 'rgba(34,211,238,0.10)',   source: 'ECB' },

  // NBP — emerald
  'NBP::NEWS':    { color: '#34d399', symbol: '●', label: 'NBP · NEWS',    bg: 'rgba(52,211,153,0.10)',   source: 'NBP' },
}

// Sub-feed labels grouped by source — used to render channel chips
export const SOURCE_SUBFEEDS: Record<string, string[]> = {
  FED: ['PRESS', 'SPEECH', 'FOMC', 'POLICY'],
  ECB: ['PRESS', 'SPEECH', 'BLOG', 'PUB'],
  NBP: ['NEWS'],
}

// Primary accent color per source (for source-level buttons/borders)
export const SOURCE_COLOR: Record<string, string> = {
  FED: '#f59e0b',
  ECB: '#38bdf8',
  NBP: '#34d399',
}

export function getFeedMeta(source: string, feedLabel: string): FeedMeta {
  return (
    FEED_META[`${source}::${feedLabel}`] ?? {
      color: '#6b7280',
      symbol: '○',
      label: `${source} · ${feedLabel}`,
      bg: 'rgba(107,114,128,0.10)',
      source: source as 'FED' | 'ECB' | 'NBP',
    }
  )
}
