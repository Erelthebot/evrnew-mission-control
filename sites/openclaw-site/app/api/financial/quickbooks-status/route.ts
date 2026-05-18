import { NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

export const dynamic = 'force-dynamic'

const TOKENS   = path.join(os.homedir(), 'evrnew-marketing/scripts/quickbooks/qb-tokens.json')
const QB_CACHE = path.join(os.homedir(), 'evrnew-marketing/data/qb-dashboard.json')

export async function GET() {
  try {
    if (!fs.existsSync(TOKENS)) {
      return NextResponse.json({ connected: false })
    }

    const tok = JSON.parse(fs.readFileSync(TOKENS, 'utf8'))
    const savedAt = tok.saved_at ? new Date(tok.saved_at) : null
    const refreshTtlDays = tok.x_refresh_token_expires_in
      ? Math.round(tok.x_refresh_token_expires_in / 86400)
      : null
    const tokenExpiry = savedAt && refreshTtlDays
      ? new Date(savedAt.getTime() + refreshTtlDays * 86400 * 1000)
          .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'unknown'

    const lastSync = fs.existsSync(QB_CACHE)
      ? new Date(fs.statSync(QB_CACHE).mtimeMs)
          .toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : null

    return NextResponse.json({
      connected: true,
      companyName: 'Evrnew LLC',
      realmId: tok.realm_id ?? '9130356013963916',
      tokenExpiry,
      lastSync,
    })
  } catch (err) {
    return NextResponse.json({ connected: false, error: String(err) }, { status: 500 })
  }
}
