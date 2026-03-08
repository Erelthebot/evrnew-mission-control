import { NextRequest, NextResponse } from 'next/server'

const BUFFER_GRAPH = 'https://graph.buffer.com'

function authHeader() {
  return `Bearer ${process.env.BUFFER_SESSION_TOKEN}`
}

export async function GET(req: NextRequest) {
  const token = process.env.BUFFER_SESSION_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'BUFFER_SESSION_TOKEN not set' }, { status: 500 })
  }

  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'account'

  let query = ''
  if (action === 'account') {
    query = `{ account { id email currentOrganization { id name } channels { id name service } } }`
  } else if (action === 'posts') {
    query = `{ account { channels { id name service recentPosts { id text status scheduledAt } } } }`
  } else {
    query = `{ account { id email } }`
  }

  const res = await fetch(BUFFER_GRAPH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader(),
    },
    body: JSON.stringify({ query }),
  })

  const data = await res.json()
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: NextRequest) {
  const token = process.env.BUFFER_SESSION_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'BUFFER_SESSION_TOKEN not set' }, { status: 500 })
  }

  const body = await req.json()

  const res = await fetch(BUFFER_GRAPH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader(),
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  return NextResponse.json(data)
}
