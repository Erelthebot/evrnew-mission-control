export const dynamic = 'force-dynamic'

interface Svc {
  name: string
  key: string
  category: string
  status: 'ok' | 'configured' | 'down' | 'unknown'
  latencyMs?: number
  detail?: string
}

async function pingUrl(name: string, key: string, category: string, url: string, opts?: RequestInit): Promise<Svc> {
  const t0 = Date.now()
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(3000), cache: 'no-store', ...opts })
    return { name, key, category, status: r.status < 500 ? 'ok' : 'down', latencyMs: Date.now() - t0 }
  } catch {
    return { name, key, category, status: 'down', latencyMs: Date.now() - t0 }
  }
}

function envCheck(name: string, key: string, category: string, envKey: string): Svc {
  return {
    name, key, category,
    status: process.env[envKey] ? 'configured' : 'unknown',
  }
}

async function pingDataForSEO(): Promise<Svc> {
  const login = process.env.DATAFORSEO_LOGIN
  const pass  = process.env.DATAFORSEO_PASSWORD
  if (!login || !pass) return { name: 'DataForSEO', key: 'dataforseo', category: 'seo', status: 'unknown' }
  const t0 = Date.now()
  try {
    const creds = Buffer.from(`${login}:${pass}`).toString('base64')
    const r = await fetch('https://api.dataforseo.com/v3/appendix/user_data', {
      headers: { Authorization: `Basic ${creds}` },
      signal: AbortSignal.timeout(4000),
      cache: 'no-store',
    })
    return { name: 'DataForSEO', key: 'dataforseo', category: 'seo', status: r.ok ? 'ok' : 'down', latencyMs: Date.now() - t0 }
  } catch {
    return { name: 'DataForSEO', key: 'dataforseo', category: 'seo', status: 'down', latencyMs: Date.now() - t0 }
  }
}

async function pingTelegram(): Promise<Svc> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return { name: 'Telegram Bot', key: 'telegram', category: 'comm', status: 'unknown' }
  const t0 = Date.now()
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      signal: AbortSignal.timeout(3000),
      cache: 'no-store',
    })
    const d = await r.json()
    return {
      name: 'Telegram Bot',
      key: 'telegram',
      category: 'comm',
      status: d.ok ? 'ok' : 'down',
      latencyMs: Date.now() - t0,
      detail: d.result?.username ? `@${d.result.username}` : undefined,
    }
  } catch {
    return { name: 'Telegram Bot', key: 'telegram', category: 'comm', status: 'down', latencyMs: Date.now() - t0 }
  }
}

async function pingSupabase(): Promise<Svc> {
  const url = process.env.SUPABASE_URL
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { name: 'Supabase', key: 'supabase', category: 'infra', status: 'unknown' }
  const t0 = Date.now()
  try {
    const r = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(4000),
      cache: 'no-store',
    })
    return { name: 'Supabase', key: 'supabase', category: 'infra', status: r.status < 500 ? 'ok' : 'down', latencyMs: Date.now() - t0 }
  } catch {
    return { name: 'Supabase', key: 'supabase', category: 'infra', status: 'down', latencyMs: Date.now() - t0 }
  }
}

export async function GET() {
  const [gateway, relay, dataForSEO, telegram, supabase] = await Promise.all([
    pingUrl('OpenClaw Gateway', 'gateway', 'infra', 'http://127.0.0.1:18789/'),
    pingUrl('Browser Relay',    'relay',   'infra', 'http://127.0.0.1:18792/health'),
    pingDataForSEO(),
    pingTelegram(),
    pingSupabase(),
  ])

  const services: Svc[] = [
    // Infrastructure
    gateway,
    relay,
    supabase,
    envCheck('GitHub',        'github',     'infra', 'GITHUB_TOKEN'),
    envCheck('Cloudflare',    'cloudflare', 'infra', 'CLOUDFLARE_API_TOKEN'),

    // AI / ML
    envCheck('Anthropic',    'anthropic',   'ai', 'ANTHROPIC_API_KEY'),
    envCheck('xAI / Grok',   'xai',         'ai', 'XAI_API_KEY'),
    envCheck('BrowserBase',  'browserbase', 'ai', 'BROWSERBASE_API_KEY'),

    // SEO & Analytics
    dataForSEO,
    envCheck('SpyFu',           'spyfu',   'seo', 'SPYFU_API_ID'),
    envCheck('GTM',             'gtm',     'seo', 'GTM_CONTAINER_ID'),
    envCheck('GA4',             'ga4',     'seo', 'GA_MEASUREMENT_ID'),
    envCheck('Google Maps',     'gmaps',   'seo', 'GOOGLE_MAPS_API_KEY'),

    // Marketing & Ads
    envCheck('Google Ads',  'gads',    'marketing', 'GOOGLE_ADS_CLIENT_ID'),
    envCheck('GHL',         'ghl',     'marketing', 'GHL_API_KEY'),
    envCheck('Moltbook',    'moltbook','marketing', 'MOLTBOOK_API_KEY'),
    envCheck('Buffer',      'buffer',  'marketing', 'BUFFER_SESSION_TOKEN'),
    envCheck('Brave Ads',   'brave',   'marketing', 'BRAVE_API_KEY'),

    // Communication
    telegram,
    envCheck('SendGrid',    'sendgrid', 'comm', 'SENDGRID_API_KEY'),
    envCheck('Twilio',      'twilio',   'comm', 'TWILIO_AUTH_TOKEN'),
    envCheck('Gmail',       'gmail',    'comm', 'EREL_GMAIL_APP_PASSWORD'),
  ]

  return Response.json({ services, ts: Date.now() })
}
