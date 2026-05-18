import { NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const CACHE_FILE = path.join(os.homedir(), 'evrnew-marketing/data/qb-dashboard.json')
const CACHE_TTL_MS = 35 * 60 * 1000 // 35 minutes

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Cache-first: return file if fresh
    if (fs.existsSync(CACHE_FILE)) {
      const stat = fs.statSync(CACHE_FILE)
      const ageMs = Date.now() - stat.mtimeMs
      if (ageMs < CACHE_TTL_MS) {
        const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'))
        return NextResponse.json(data, {
          headers: { 'Cache-Control': 'no-store', 'X-QB-Source': 'cache' },
        })
      }
    }

    // Cache stale or missing — return stale data with a flag rather than blocking
    if (fs.existsSync(CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'))
      data._stale = true
      return NextResponse.json(data, {
        headers: { 'Cache-Control': 'no-store', 'X-QB-Source': 'stale-cache' },
      })
    }

    // No cache at all
    return NextResponse.json(
      { error: 'QB data not available. Run: python3 scripts/qb-dashboard-data.py' },
      { status: 503 }
    )
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
