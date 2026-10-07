# Hyperliquid TradFi Terminal

One Next.js app with two tabs:

- **MARKET** — TradFi quotes from the public Hyperliquid API (HIP-3 `xyz` / `cash` dexes plus BTC / ETH): price, change, day or weekend range, candlestick chart per instrument (TradingView Lightweight Charts), screenshot to share.
- **NEWS** — headlines from FED, ECB, NBP, Reuters, Bloomberg, Stooq and Axios via `/api/rss`, with filters, search, bookmarks, auto-refresh, read-aloud (Web Speech API) and an export for TypeSafe Jev.

The NEWS tab stays mounted while MARKET is shown, so auto-refresh and voice keep running. `?tab=news` / `?tab=market` open a tab directly; the last tab is remembered.

## Run

```bash
npm ci
npm run dev     # http://localhost:3000
npm run build
```

No API keys or environment variables. Hosted on Vercel (Hobby); every merge to `main` deploys to production.

## Layout

| Path | What |
|---|---|
| `src/app/api/rss/route.ts` | Server route that fetches all RSS feeds (avoids browser CORS) |
| `src/components/App.tsx` | Tabs, app bar, URL / remembered tab |
| `src/components/market/` | MARKET tab: table, chart sheet, styles |
| `src/lib/market.ts` | Hyperliquid API, instruments, formatting |
| `src/components/Terminal.tsx` | NEWS tab |
| `src/lib/speech.ts`, `src/lib/jevExport.ts` | Read-aloud and Jev export |
