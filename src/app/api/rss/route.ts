import { NextResponse } from 'next/server'
import { fetchAllFeedXml } from '@/lib/feeds'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { feeds, errors } = await fetchAllFeedXml()
  return NextResponse.json(
    { feeds, errors },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  )
}
