import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = 'https://api.dataforseo.com/v3'

function authHeader() {
  const b64 = process.env.DATAFORSEO_BASE64
  if (b64) return `Basic ${b64}`
  const login = process.env.DATAFORSEO_LOGIN
  const password = process.env.DATAFORSEO_PASSWORD
  if (login && password) return `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`
  return null
}

// GET /api/dataforseo?keyword=insulation+contractor&location=Seattle
export async function GET(req: NextRequest) {
  const auth = authHeader()
  if (!auth) return NextResponse.json({ error: 'DataForSEO credentials not configured' }, { status: 503 })

  const { searchParams } = new URL(req.url)
  const keyword = searchParams.get('keyword')
  const locationName = searchParams.get('location') || 'United States'
  const languageCode = searchParams.get('lang') || 'en'

  if (!keyword) return NextResponse.json({ error: 'keyword param required' }, { status: 400 })

  try {
    const res = await fetch(`${BASE_URL}/serp/google/organic/live/advanced`, {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify([{ keyword, location_name: locationName, language_code: languageCode, depth: 10 }]),
    })
    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data }, { status: res.status })
    return NextResponse.json(data)
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

// POST /api/dataforseo — proxy any endpoint
// Body: { endpoint: string, payload: object[] }
export async function POST(req: NextRequest) {
  const auth = authHeader()
  if (!auth) return NextResponse.json({ error: 'DataForSEO credentials not configured' }, { status: 503 })

  const { endpoint, payload } = await req.json()
  if (!endpoint || !payload) return NextResponse.json({ error: 'endpoint and payload required' }, { status: 400 })

  try {
    const res = await fetch(`${BASE_URL}/${endpoint}`, {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.ok ? 200 : res.status })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
