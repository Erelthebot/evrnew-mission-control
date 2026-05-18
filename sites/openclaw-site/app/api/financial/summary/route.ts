import { NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

export const dynamic = 'force-dynamic'

const QB_CACHE = path.join(os.homedir(), 'evrnew-marketing/data/qb-dashboard.json')
const TOKENS   = path.join(os.homedir(), 'evrnew-marketing/scripts/quickbooks/qb-tokens.json')

export async function GET() {
  try {
    const connected = fs.existsSync(TOKENS)

    if (!fs.existsSync(QB_CACHE)) {
      return NextResponse.json({ connected, error: 'no_cache' }, { status: 503 })
    }

    const raw = JSON.parse(fs.readFileSync(QB_CACHE, 'utf8'))
    const asOf = raw.fetchedAt
      ? new Date(raw.fetchedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : undefined

    return NextResponse.json({
      connected,
      accountsReceivable: raw.total_receivable                              ?? null,
      accountsPayable:    raw.total_payable                                 ?? null,
      revenue:            raw.revenue_mtd    ?? raw.weekly_payments_received ?? null,
      expenses:           raw.expenses_mtd                                  ?? null,
      netIncome:          raw.net_income_mtd                                ?? null,
      cashOnHand:         raw.cash_on_hand                                  ?? null,
      plPeriod:           raw.pl_period                                     ?? null,
      asOf,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
