export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import https from 'https'
import fs from 'fs'
import path from 'path'
import os from 'os'

const CLIENT_ID     = 'ABjBcFASs9aPJevZx8NgtwQCnExI9uGmDD6YnujMHfKjkw9xOR'
const CLIENT_SECRET = 'XST4BYEpLZmcXtf5wjghDPvmZ5A0mu1rjncnXouz'
const REDIRECT_URI  = 'https://erel.evrnew.com/api/qb-callback'
const TOKEN_FILE    = path.join(os.homedir(), 'evrnew-marketing/scripts/quickbooks/qb-tokens.json')

function exchangeCode(code: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI }).toString()
    const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
    const req = https.request({
      hostname: 'oauth.platform.intuit.com',
      path: '/oauth2/v1/tokens/bearer',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${creds}`,
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = ''
      res.on('data', (c: string) => data += c)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch (e) { reject(e) }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code    = searchParams.get('code')
  const realmId = searchParams.get('realmId')
  const error   = searchParams.get('error')

  if (error) {
    return new NextResponse(`<html><body><h2>QB Auth Error: ${error}</h2></body></html>`, {
      headers: { 'Content-Type': 'text/html' },
    })
  }

  if (!code || !realmId) {
    return new NextResponse('<html><body><h2>Missing code or realmId</h2></body></html>', {
      headers: { 'Content-Type': 'text/html' },
    })
  }

  try {
    const tokens = await exchangeCode(code)
    const payload = { ...tokens, realm_id: realmId, saved_at: new Date().toISOString() }
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(payload, null, 2))

    return new NextResponse(
      `<html><head><meta charset="utf-8"/></head><body style="font-family:sans-serif;padding:40px">
        <h2>&#x2705; QuickBooks Connected!</h2>
        <p>Realm ID: <code>${realmId}</code></p>
        <p>Tokens saved. You can close this tab.</p>
        <p>Run <code>python3 ~/evrnew-marketing/agents/shared/qb_tool.py test</code> to verify.</p>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return new NextResponse(`<html><body><h2>Token exchange failed: ${msg}</h2></body></html>`, {
      headers: { 'Content-Type': 'text/html' },
      status: 500,
    })
  }
}
