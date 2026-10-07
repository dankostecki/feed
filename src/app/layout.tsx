import type { Metadata, Viewport } from 'next'
import './globals.css'

export const viewport: Viewport = {
  viewportFit: 'cover',
  themeColor: '#0a0a0a',
}

export const metadata: Metadata = {
  title: 'Hyperliquid TradFi Terminal',
  description: 'TradFi quotes from Hyperliquid (indices, commodities, FX, crypto) and a live news feed: FED, ECB, NBP, Reuters, Bloomberg, Stooq, Axios',
  icons: { icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>◈</text></svg>" },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
