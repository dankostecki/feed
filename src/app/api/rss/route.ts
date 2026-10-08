import { getNews } from '@/lib/rssServer'

export const dynamic = 'force-dynamic'

// Compact headline list (no descriptions / article bodies), serialised once per fetch.
// Shared CDN cache for 60s: refreshes from several tabs or devices within a minute do
// not start the function again.
export async function GET() {
  const { body } = await getNews()
  return new Response(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=30',
    },
  })
}
