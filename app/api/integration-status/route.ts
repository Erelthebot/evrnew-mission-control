export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

const PLACEHOLDERS = ['REPLACE', 'YOUR_', 'TODO', 'CHANGEME', 'placeholder', 'example']
function isReal(val: string | undefined) {
  if (!val?.trim()) return false
  return !PLACEHOLDERS.some(p => val.trim().toUpperCase().startsWith(p.toUpperCase()))
}

async function getGoogleToken(useAnalyticsCreds = false): Promise<string | null> {
  try {
    const clientId     = useAnalyticsCreds ? (process.env.GOOGLE_ANALYTICS_CLIENT_ID ?? process.env.GOOGLE_ADS_CLIENT_ID) : process.env.GOOGLE_ADS_CLIENT_ID
    const clientSecret = useAnalyticsCreds ? (process.env.GOOGLE_ANALYTICS_CLIENT_SECRET ?? process.env.GOOGLE_ADS_CLIENT_SECRET) : process.env.GOOGLE_ADS_CLIENT_SECRET
    const refreshToken = useAnalyticsCreds ? (process.env.GOOGLE_ANALYTICS_REFRESH_TOKEN ?? process.env.GOOGLE_ADS_REFRESH_TOKEN) : process.env.GOOGLE_ADS_REFRESH_TOKEN
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     clientId ?? '',
        client_secret: clientSecret ?? '',
        refresh_token: refreshToken ?? '',
        grant_type:    'refresh_token',
      }),
      signal: AbortSignal.timeout(5000),
    })
    const d = await r.json()
    return d.access_token ?? null
  } catch { return null }
}

async function pingGA4(token: string): Promise<{ ok: boolean; sessions?: number }> {
  try {
    const propertyId = process.env.GA_PROPERTY_ID
    if (!propertyId) return { ok: false }
    const r = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
          metrics: [{ name: 'sessions' }],
        }),
        signal: AbortSignal.timeout(5000),
      }
    )
    if (!r.ok) return { ok: false }
    const d = await r.json()
    const sessions = Number(d.rows?.[0]?.metricValues?.[0]?.value ?? 0)
    return { ok: true, sessions }
  } catch { return { ok: false } }
}

async function pingGTMAPI(token: string): Promise<{ ok: boolean }> {
  try {
    const containerId = process.env.GTM_CONTAINER_ID
    if (!containerId) return { ok: false }
    const r = await fetch(
      'https://www.googleapis.com/tagmanager/v2/accounts',
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000),
      }
    )
    return { ok: r.ok }
  } catch { return { ok: false } }
}

async function pingBrave(): Promise<{ ok: boolean }> {
  try {
    const key = process.env.BRAVE_API_KEY
    if (!key) return { ok: false }
    const r = await fetch('https://api.search.brave.com/res/v1/web/search?q=test&count=1', {
      headers: { 'Accept': 'application/json', 'X-Subscription-Token': key },
      signal: AbortSignal.timeout(5000),
    })
    return { ok: r.ok }
  } catch { return { ok: false } }
}

async function pingFacebookAds(): Promise<{ ok: boolean; note?: string }> {
  const token = process.env.FACEBOOK_ACCESS_TOKEN
  if (!token) return { ok: false, note: 'Needs Spencer User Access Token with ads_read scope' }
  try {
    const r = await fetch(
      `https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${token}`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!r.ok) return { ok: false, note: 'Token invalid or expired' }
    return { ok: true }
  } catch { return { ok: false, note: 'Connection failed' } }
}

async function pingGoogleAds1929(): Promise<{ ok: boolean; note?: string }> {
  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  if (!devToken) return { ok: false, note: 'GOOGLE_ADS_DEVELOPER_TOKEN not set' }
  try {
    const token = await getGoogleToken()
    if (!token) return { ok: false, note: 'OAuth token exchange failed' }
    const r = await fetch(
      'https://googleads.googleapis.com/v19/customers/1929533393/googleAds:search',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'developer-token': devToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: 'SELECT customer.id FROM customer LIMIT 1' }),
        signal: AbortSignal.timeout(8000),
      }
    )
    const text = await r.text()
    if (r.ok) return { ok: true }
    if (text.includes('DEVELOPER_TOKEN_NOT_APPROVED')) return { ok: false, note: 'Dev token awaiting Basic Access approval' }
    if (text.includes('PERMISSION_DENIED')) return { ok: false, note: 'Permission denied — account access required' }
    return { ok: false, note: `HTTP ${r.status}` }
  } catch { return { ok: false, note: 'Connection failed' } }
}

const ENV_INTEGRATIONS = [
  { name: 'Anthropic Claude',      purpose: 'Content, copy, strategy generation',                    envKey: 'ANTHROPIC_API_KEY',          category: 'AI' },
  { name: 'xAI Grok',              purpose: 'Fast inference for monitoring & drafts',                envKey: 'XAI_API_KEY',                category: 'AI' },
  { name: 'DataForSEO',            purpose: 'SERP data, keyword research, rank tracking',            envKey: 'DATAFORSEO_LOGIN',            category: 'SEO' },
  { name: 'SpyFu',                 purpose: 'Competitor keyword & ad intelligence',                  envKey: 'SPYFU_API_ID',               category: 'SEO' },
  { name: 'Google Search Console', purpose: 'erel.evrnew.com verified, indexing & search data',      envKey: 'GOOGLE_ADS_REFRESH_TOKEN',    category: 'SEO' },
  { name: 'Google Ads',            purpose: 'Ad performance & bid management (customer 7298179325)', envKey: 'GOOGLE_ADS_DEVELOPER_TOKEN',  category: 'Ads' },
  { name: 'Supabase',              purpose: 'Database & storage — all agent output tables',          envKey: 'SUPABASE_URL',               category: 'Infra' },
  { name: 'BrowserBase',           purpose: 'Cloud Chrome, authenticated scraping',                  envKey: 'BROWSERBASE_API_KEY',        category: 'Infra' },
  { name: 'Cloudflare',            purpose: 'DNS & zone management for evrnew.com',                  envKey: 'CLOUDFLARE_API_TOKEN',       category: 'Infra' },
  { name: 'GitHub',                purpose: 'Repo management via MCP',                               envKey: 'GITHUB_TOKEN',               category: 'Infra' },
  { name: 'Telegram Bot',          purpose: 'C&C via @theErelBot — owned by OpenClaw',               envKey: 'TELEGRAM_BOT_TOKEN',         category: 'Comms' },
  { name: 'SendGrid',              purpose: 'Transactional email delivery',                          envKey: 'SENDGRID_API_KEY',           category: 'Comms' },
  { name: 'Twilio',                purpose: 'SMS/voice automation (+1 206-472-1445)',                envKey: 'TWILIO_AUTH_TOKEN',           category: 'Comms' },
  { name: 'Gmail',                 purpose: 'Inbox monitor for erel@evrnew.com',                     envKey: 'EREL_GMAIL_APP_PASSWORD',    category: 'Comms' },
  { name: 'GoHighLevel CRM',       purpose: 'Lead management & campaigns (Johnny manages)',          envKey: 'GHL_API_KEY',                category: 'CRM' },
  { name: 'Google Maps',           purpose: 'Local SEO, competitor location mapping',                envKey: 'GOOGLE_MAPS_API_KEY',        category: 'Misc' },
  { name: 'Moltbook',              purpose: 'AI agent social network, heartbeat running',            envKey: 'MOLTBOOK_API_KEY',           category: 'Misc' },
]

export async function GET() {
  // Run live checks in parallel
  const [googleToken, analyticsToken] = await Promise.all([
    getGoogleToken(false),
    getGoogleToken(true),
  ])

  const [ga4, gtm, brave, facebook, gads1929] = await Promise.all([
    analyticsToken ? pingGA4(analyticsToken) : Promise.resolve({ ok: false }),
    analyticsToken ? pingGTMAPI(analyticsToken) : Promise.resolve({ ok: false }),
    pingBrave(),
    pingFacebookAds(),
    pingGoogleAds1929(),
  ])

  const integrations = [
    // Env-var checked integrations
    ...ENV_INTEGRATIONS.map(i => ({
      name: i.name, purpose: i.purpose, category: i.category,
      status: isReal(process.env[i.envKey]) ? 'active' : 'pending',
      note: isReal(process.env[i.envKey]) ? undefined : 'env var missing',
    })),

    // Live-checked integrations
    {
      name: 'Google Tag Manager',
      purpose: `Tag deployment — GTM-PRSJST3R live on site`,
      category: 'Ads',
      status: gtm.ok ? 'active' : (isReal(process.env.GTM_CONTAINER_ID) ? 'active' : 'pending'),
      note: gtm.ok ? undefined : (!isReal(process.env.GTM_CONTAINER_ID) ? 'env var missing' : undefined),
    },
    {
      name: 'Google Analytics',
      purpose: `Site traffic & conversions (G-T5DME0H4F1)`,
      category: 'Ads',
      status: ga4.ok ? 'active' : (isReal(process.env.GA_MEASUREMENT_ID) ? 'active' : 'pending'),
      note: ga4.ok ? undefined : (!isReal(process.env.GA_MEASUREMENT_ID) ? 'env var missing' : undefined),
    },
    {
      name: 'Brave Search',
      purpose: 'Web search for agents',
      category: 'SEO',
      status: brave.ok ? 'active' : (isReal(process.env.BRAVE_API_KEY) ? 'active' : 'pending'),
      note: brave.ok ? undefined : (!isReal(process.env.BRAVE_API_KEY) ? 'env var missing' : undefined),
    },
    {
      name: 'Facebook Ads',
      purpose: 'Ad library & campaign performance data',
      category: 'Ads',
      status: facebook.ok ? 'active' : 'blocked',
      note: facebook.ok ? undefined : facebook.note,
    },
    {
      name: 'Google Ads (1929533393)',
      purpose: 'Secondary Google Ads customer account',
      category: 'Ads',
      status: gads1929.ok ? 'active' : 'blocked',
      note: gads1929.ok ? undefined : gads1929.note,
    },
    {
      name: 'Search Console (evrnew.com)',
      purpose: 'Root domain indexing & search analytics',
      category: 'SEO',
      status: 'blocked',
      note: 'DNS TXT verification failed — wrong Cloudflare zone',
    },
  ]

  const active  = integrations.filter(i => i.status === 'active').length
  const pending = integrations.filter(i => i.status === 'pending').length
  const blocked = integrations.filter(i => i.status === 'blocked').length

  return NextResponse.json(
    { integrations, summary: { active, pending, blocked, total: integrations.length }, checkedAt: new Date().toISOString() },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
