import { NextRequest, NextResponse } from 'next/server'

const SYSTEM = `You are Erel, the AI behind OpenClaw — an AI-native marketing agency built specifically for insulation and home performance contractors in the Pacific Northwest. You help businesses like EVRNEW grow through fully automated marketing: SEO blog posts, Google and Meta ad copy, social media, email drip campaigns, competitive intelligence, and more — all running 24/7 on autonomous AI agents.

You're direct, sharp, and focused on results. You know the insulation market deeply: attic insulation, crawl space encapsulation, spray foam, blown-in insulation, rebate programs (PSE, Puget Sound Energy, BPA), and PNW homeowners as the target customer.

When someone asks what you do, explain OpenClaw as an AI marketing system — not a marketing agency with people, but a fleet of autonomous agents that produce daily content, manage ad campaigns, and monitor competitors automatically. The owner just needs to review outputs and focus on their business.

Keep responses concise and useful. If someone wants to work with OpenClaw, ask for their name, company, and what type of home service business they run. Don't make up specific pricing — say you'll be in touch. Be confident and a bit bold.`

async function chatXAI(messages: object[]): Promise<string> {
  const apiKey = process.env.XAI_API_KEY!
  const r = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'grok-3',
      max_tokens: 500,
      messages: [{ role: 'system', content: SYSTEM }, ...messages],
    }),
  })
  if (!r.ok) throw new Error(`xAI ${r.status}`)
  const d = await r.json()
  return d.choices[0].message.content
}

async function chatGemini(messages: object[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not set')
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gemini-2.0-pro-exp',
      max_tokens: 500,
      messages: [{ role: 'system', content: SYSTEM }, ...messages],
    }),
  })
  if (!r.ok) throw new Error(`Gemini ${r.status}`)
  const d = await r.json()
  return d.choices[0].message.content
}

export async function POST(req: NextRequest) {
  const { messages } = await req.json()

  // xAI primary — Gemini fallback if xAI is down
  try {
    const reply = await chatXAI(messages)
    return NextResponse.json({ reply })
  } catch {
    try {
      const reply = await chatGemini(messages)
      return NextResponse.json({ reply })
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 500 })
    }
  }
}
