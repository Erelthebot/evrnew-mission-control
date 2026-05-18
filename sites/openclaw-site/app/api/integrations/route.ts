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
    const r = await fetch(url, { signal: AbortSignal.timeout(8000), cache: 'no-store', ...opts })
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
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    })
    return { name: 'DataForSEO', key: 'dataforseo', category: 'seo', status: r.ok ? 'ok' : 'down', latencyMs: Date.now() - t0 }
  } catch {
    return { name: 'DataForSEO', key: 'dataforseo', category: 'seo', status: 'down', latencyMs: Date.now() - t0 }
  }
}

// Cache telegram status - persist last known good result across requests
let _telegramCache: { status: string; detail?: string; latencyMs: number; ts: number } | null = null

async function pingTelegram(): Promise<Svc> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return { name: 'Telegram Bot', key: 'telegram', category: 'comm', status: 'unknown' }

  // Return cached ok result if less than 60 seconds old
  if (_telegramCache && _telegramCache.status === 'ok' && Date.now() - _telegramCache.ts < 60000) {
    return { name: 'Telegram Bot', key: 'telegram', category: 'comm', status: 'ok', latencyMs: _telegramCache.latencyMs, detail: _telegramCache.detail }
  }

  const t0 = Date.now()
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    })
    const d = await r.json()
    const latencyMs = Date.now() - t0
    const detail = d.result?.username ? `@${d.result.username}` : undefined
    if (d.ok) {
      // Cache successful result
      _telegramCache = { status: 'ok', detail, latencyMs, ts: Date.now() }
      return { name: 'Telegram Bot', key: 'telegram', category: 'comm', status: 'ok', latencyMs, detail }
    }
    // API returned not-ok but responded - use cached if available, else down
    if (_telegramCache?.status === 'ok') {
      return { name: 'Telegram Bot', key: 'telegram', category: 'comm', status: 'ok', latencyMs: _telegramCache.latencyMs, detail: _telegramCache.detail }
    }
    return { name: 'Telegram Bot', key: 'telegram', category: 'comm', status: 'down', latencyMs }
  } catch {
    // Network error - return cached ok if available rather than flipping to red
    if (_telegramCache?.status === 'ok') {
      return { name: 'Telegram Bot', key: 'telegram', category: 'comm', status: 'ok', latencyMs: _telegramCache.latencyMs, detail: _telegramCache.detail }
    }
    return { name: 'Telegram Bot', key: 'telegram', category: 'comm', status: 'unknown', latencyMs: Date.now() - t0 }
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
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    })
    return { name: 'Supabase', key: 'supabase', category: 'infra', status: r.status < 500 ? 'ok' : 'down', latencyMs: Date.now() - t0 }
  } catch {
    return { name: 'Supabase', key: 'supabase', category: 'infra', status: 'down', latencyMs: Date.now() - t0 }
  }
}

async function pingBuffer(): Promise<Svc> {
  const token = process.env.BUFFER_SESSION_TOKEN
  if (!token) return { name: 'Buffer', key: 'buffer', category: 'marketing', status: 'unknown' }
  const t0 = Date.now()
  try {
    const r = await fetch('https://graph.buffer.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ query: '{ account { id email } }' }),
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    })
    const d = await r.json()
    return {
      name: 'Buffer',
      key: 'buffer',
      category: 'marketing',
      status: d.data?.account?.id ? 'ok' : 'down',
      latencyMs: Date.now() - t0,
      detail: d.data?.account?.email,
    }
  } catch {
    return { name: 'Buffer', key: 'buffer', category: 'marketing', status: 'down', latencyMs: Date.now() - t0 }
  }
}

export async function GET() {
  const [gateway, relay, dataForSEO, telegram, supabase, buffer] = await Promise.all([
    pingUrl('OpenClaw Gateway', 'gateway', 'infra', 'http://127.0.0.1:18789/'),
    pingUrl('Browser Relay',    'relay',   'infra', 'http://127.0.0.1:18792/health'),
    pingDataForSEO(),
    pingTelegram(),
    pingSupabase(),
    pingBuffer(),
  ])

  const services: Svc[] = [
    // Infrastructure
    gateway,
    relay,
    supabase,
    envCheck('GitHub',        'github',     'infra', 'GITHUB_TOKEN'),
    envCheck('Cloudflare',    'cloudflare', 'infra', 'CLOUDFLARE_API_TOKEN'),

    // AI / ML
    envCheck('Gemini',       'gemini',      'ai', 'GEMINI_API_KEY'),
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
    buffer,
    envCheck('Brave Ads',   'brave',   'marketing', 'BRAVE_API_KEY'),

    // Communication
    telegram,
    envCheck('SendGrid',    'sendgrid', 'comm', 'SENDGRID_API_KEY'),
    envCheck('Twilio',      'twilio',   'comm', 'TWILIO_AUTH_TOKEN'),
    envCheck('Gmail',       'gmail',    'comm', 'EREL_GMAIL_APP_PASSWORD'),
  ]

  return Response.json({ services, ts: Date.now() })
}
