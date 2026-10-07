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

Hosted on Vercel (Hobby); every merge to `main` deploys to production.

### Environment variables

| Name | Needed for | Notes |
|---|---|---|
| `TYPESAFE_API_KEY` | NEWS → Settings → **TOP 4H / 8H / 24H** (ranking by TypeSafe Jev) | Server only. Set in Vercel → Settings → Environment Variables, then redeploy. Never commit it. |
| `TYPESAFE_API_URL`, `TYPESAFE_MODEL` | optional | Defaults: `https://api.typesafe.ai/v1/systemone`, `jev-latest` |

Without the key everything else works; the TOP view explains how to set it.
`/api/jev?hours=4|8|24` ranks only headlines the server fetched itself and reuses a ranking for 5 minutes (memory + CDN cache), so each window costs at most one Jev call per 5 minutes.

## Layout

| Path | What |
|---|---|
| `src/lib/feeds.ts`, `src/app/api/rss/route.ts` | RSS sources; server route that fetches them (avoids browser CORS) |
| `src/app/api/jev/route.ts`, `src/lib/jevApi.ts`, `src/lib/rssServer.ts` | TOP news: server-side RSS parsing and the Jev call |
| `src/components/JevTop.tsx` | TOP NEWS view |
| `src/components/App.tsx` | Tabs, app bar, URL / remembered tab |
| `src/components/market/` | MARKET tab: table, chart sheet, styles |
| `src/lib/market.ts` | Hyperliquid API, instruments, formatting |
| `src/components/Terminal.tsx` | NEWS tab |
| `src/lib/speech.ts`, `src/lib/jevExport.ts` | Read-aloud and Jev export |
