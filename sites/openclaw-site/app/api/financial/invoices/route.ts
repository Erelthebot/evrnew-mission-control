import { NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

export const dynamic = 'force-dynamic'

const TOKEN_FILE    = path.join(os.homedir(), 'evrnew-marketing/scripts/quickbooks/qb-tokens.json')
const QB_CLIENT_ID  = process.env.QB_CLIENT_ID!
const QB_CLIENT_SECRET = process.env.QB_CLIENT_SECRET!
const QB_BASE       = 'https://quickbooks.api.intuit.com'
const OAUTH_URL     = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'

interface Tokens {
  access_token: string
  refresh_token: string
  realm_id: string
  expires_in: number
  saved_at: string
  [k: string]: unknown
}

async function loadOrRefreshTokens(): Promise<Tokens> {
  if (!fs.existsSync(TOKEN_FILE)) throw new Error('QB not connected')
  const tokens: Tokens = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'))

  const savedAt  = new Date(tokens.saved_at).getTime() / 1000
  const expiresIn = Number(tokens.expires_in ?? 3600)
  const needsRefresh = Date.now() / 1000 > savedAt + expiresIn - 120

  if (!needsRefresh) return tokens

  const creds = Buffer.from(`${QB_CLIENT_ID}:${QB_CLIENT_SECRET}`).toString('base64')
  const res = await fetch(OAUTH_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(tokens.refresh_token)}`,
  })

  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`)
  const fresh = await res.json()

  const updated: Tokens = {
    ...tokens,
    access_token:  fresh.access_token,
    refresh_token: fresh.refresh_token ?? tokens.refresh_token,
    expires_in:    fresh.expires_in ?? 3600,
    saved_at:      new Date().toISOString(),
  }
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(updated, null, 2))
  return updated
}

function parseDate(s?: string): Date | null {
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

export async function GET() {
  try {
    const tokens = await loadOrRefreshTokens()
    const { access_token, realm_id } = tokens

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const query = encodeURIComponent(
      "SELECT * FROM Invoice WHERE Balance > '0' ORDER BY DueDate ASC MAXRESULTS 150"
    )
    const url = `${QB_BASE}/v3/company/${realm_id}/query?query=${query}&minorversion=65`

    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Accept': 'application/json',
      },
    })

    if (!res.ok) {
      const body = await res.text()
      return NextResponse.json({ error: `QB API ${res.status}`, detail: body }, { status: res.status })
    }

    const data = await res.json()
    const raw: unknown[] = data?.QueryResponse?.Invoice ?? []

    const invoices = raw.map((inv: unknown) => {
      const i = inv as Record<string, unknown>
      const dueDate  = parseDate(i.DueDate as string)
      const balance  = Number(i.Balance ?? 0)
      const amount   = Number((i.TotalAmt ?? i.Amount) ?? 0)
      const customer = (i.CustomerRef as Record<string, string> | undefined)?.name ?? 'Unknown'
      const docNum   = String(i.DocNumber ?? i.Id ?? '')
      const status: 'Open' | 'Overdue' =
        dueDate && dueDate < today ? 'Overdue' : 'Open'

      return {
        id:           String(i.Id ?? ''),
        docNumber:    docNum,
        customerName: customer,
        amount,
        balance,
        dueDate:      dueDate
          ? dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : '—',
        status,
      }
    })

    return NextResponse.json({ invoices })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 503 })
  }
}
