export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

async function getAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     (process.env.GOOGLE_ANALYTICS_CLIENT_ID ?? process.env.GOOGLE_ADS_CLIENT_ID)!,
      client_secret: (process.env.GOOGLE_ANALYTICS_CLIENT_SECRET ?? process.env.GOOGLE_ADS_CLIENT_SECRET)!,
      refresh_token: (process.env.GOOGLE_ANALYTICS_REFRESH_TOKEN ?? process.env.GOOGLE_ADS_REFRESH_TOKEN)!,
      grant_type:    'refresh_token',
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('Token failed: ' + JSON.stringify(data))
  return data.access_token as string
}

export async function GET() {
  const propertyId = process.env.GA_PROPERTY_ID
  if (!propertyId) return NextResponse.json({ error: 'GA_PROPERTY_ID not set' }, { status: 503 })

  try {
    const token = await getAccessToken()

    const [week, month, realtime] = await Promise.all([
      // Last 7 days
      fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
          metrics: [
            { name: 'sessions' }, { name: 'activeUsers' }, { name: 'screenPageViews' },
            { name: 'bounceRate' }, { name: 'averageSessionDuration' },
          ],
        }),
      }).then(r => r.json()),

      // Last 30 days
      fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
          metrics: [
            { name: 'sessions' }, { name: 'activeUsers' }, { name: 'newUsers' },
            { name: 'screenPageViews' }, { name: 'bounceRate' }, { name: 'averageSessionDuration' },
          ],
          dimensions: [{ name: 'sessionDefaultChannelGroup' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 8,
        }),
      }).then(r => r.json()),

      // Realtime active users
      fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics: [{ name: 'activeUsers' }] }),
      }).then(r => r.json()),
    ])

    const w = week.rows?.[0]?.metricValues ?? []
    const rt = realtime.rows?.[0]?.metricValues?.[0]?.value ?? '0'

    const channelBreakdown = (month.rows ?? []).map((row: { dimensionValues: {value:string}[], metricValues: {value:string}[] }) => ({
      channel: row.dimensionValues?.[0]?.value ?? 'Unknown',
      sessions: Number(row.metricValues?.[0]?.value ?? 0),
      users: Number(row.metricValues?.[1]?.value ?? 0),
      newUsers: Number(row.metricValues?.[2]?.value ?? 0),
      pageviews: Number(row.metricValues?.[3]?.value ?? 0),
      bounceRate: Math.round(Number(row.metricValues?.[4]?.value ?? 0) * 100) / 100,
      avgDuration: Math.round(Number(row.metricValues?.[5]?.value ?? 0)),
    }))

    return NextResponse.json({
      fetchedAt: new Date().toISOString(),
      propertyId,
      measurementId: process.env.GA_MEASUREMENT_ID,
      realtimeActiveUsers: Number(rt),
      last7Days: {
        sessions: Number(w[0]?.value ?? 0),
        activeUsers: Number(w[1]?.value ?? 0),
        pageviews: Number(w[2]?.value ?? 0),
        bounceRate: Math.round(Number(w[3]?.value ?? 0) * 100) / 100,
        avgSessionDuration: Math.round(Number(w[4]?.value ?? 0)),
      },
      last30Days: { channelBreakdown },
    }, { headers: { 'Cache-Control': 'no-store' } })

  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
