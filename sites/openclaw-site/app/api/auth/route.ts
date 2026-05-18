import { NextRequest, NextResponse } from 'next/server'

const COOKIE = 'mc_auth'
const MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export async function POST(req: NextRequest) {
  const { secret } = await req.json()
  if (!process.env.DASHBOARD_SECRET || secret !== process.env.DASHBOARD_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE, process.env.DASHBOARD_SECRET, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: MAX_AGE,
    path: '/',
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(COOKIE)
  return res
}
