// Netlify Function: Google Ads live data
// Fetches 30-day account + campaign metrics via Google Ads REST API

async function getAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_ADS_CLIENT_ID,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
      grant_type:    'refresh_token',
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('Token exchange failed: ' + JSON.stringify(data))
  return data.access_token
}

async function gaql(customerId, accessToken, query) {
  const cid = customerId.replace(/-/g, '')
  const res = await fetch(
    `https://googleads.googleapis.com/v20/customers/${cid}/googleAds:searchStream`,
    {
      method: 'POST',
      headers: {
        Authorization:     `Bearer ${accessToken}`,
        'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
        'Content-Type':    'application/json',
      },
      body: JSON.stringify({ query }),
    }
  )
  const text = await res.text()
  if (!res.ok) throw new Error(`GAQL error ${res.status}: ${text}`)
  return JSON.parse(text)
}

exports.handler = async function () {
  const required = [
    'GOOGLE_ADS_CLIENT_ID',
    'GOOGLE_ADS_CLIENT_SECRET',
    'GOOGLE_ADS_REFRESH_TOKEN',
    'GOOGLE_ADS_DEVELOPER_TOKEN',
    'GOOGLE_ADS_CUSTOMER_ID',
  ]
  const missing = required.filter(k => !process.env[k])
  if (missing.length) {
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing env vars', missing }),
    }
  }

  try {
    const accessToken  = await getAccessToken()
    const customerId   = process.env.GOOGLE_ADS_CUSTOMER_ID

    const today = new Date()
    const end   = today.toISOString().slice(0, 10)
    const start = new Date(today - 29 * 86400000).toISOString().slice(0, 10)

    const [accountData, campaignData] = await Promise.all([
      gaql(customerId, accessToken, `
        SELECT
          metrics.cost_micros,
          metrics.impressions,
          metrics.clicks,
          metrics.conversions,
          metrics.ctr,
          metrics.average_cpc
        FROM customer
        WHERE segments.date BETWEEN '${start}' AND '${end}'
      `),
      gaql(customerId, accessToken, `
        SELECT
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.advertising_channel_type,
          metrics.cost_micros,
          metrics.impressions,
          metrics.clicks,
          metrics.conversions,
          metrics.ctr
        FROM campaign
        WHERE segments.date BETWEEN '${start}' AND '${end}'
          AND campaign.status = 'ENABLED'
        ORDER BY metrics.cost_micros DESC
        LIMIT 20
      `),
    ])

    // Aggregate totals
    let cost = 0, impressions = 0, clicks = 0, conversions = 0
    for (const batch of accountData) {
      for (const row of batch.results ?? []) {
        const m = row.metrics ?? {}
        cost        += Number(m.costMicros ?? 0)
        impressions += Number(m.impressions ?? 0)
        clicks      += Number(m.clicks ?? 0)
        conversions += Number(m.conversions ?? 0)
      }
    }

    const campaigns = []
    for (const batch of campaignData) {
      for (const row of batch.results ?? []) {
        const c = row.campaign ?? {}
        const m = row.metrics ?? {}
        campaigns.push({
          id:          c.id,
          name:        c.name,
          type:        c.advertisingChannelType,
          cost:        Math.round(Number(m.costMicros ?? 0) / 1e4) / 100,
          impressions: Number(m.impressions ?? 0),
          clicks:      Number(m.clicks ?? 0),
          conversions: Math.round(Number(m.conversions ?? 0) * 10) / 10,
          ctr:         Math.round(Number(m.ctr ?? 0) * 10000) / 100,
        })
      }
    }

    const spend = Math.round(cost / 1e4) / 100
    const ctr   = impressions ? Math.round(clicks / impressions * 10000) / 100 : 0
    const cpc   = clicks ? Math.round(cost / clicks / 1e4) / 100 : 0

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // 5 min cache
      },
      body: JSON.stringify({
        fetchedAt:  new Date().toISOString(),
        dateRange:  { start, end },
        customerId,
        totals:     { spend, impressions, clicks, conversions: Math.round(conversions * 10) / 10, ctr, cpc },
        campaigns,
      }),
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    }
  }
}
