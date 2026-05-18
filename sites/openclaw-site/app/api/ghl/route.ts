export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const CACHE_FILE = join(homedir(), 'evrnew-marketing/data/ghl-dashboard.json')
const CACHE_MAX_AGE_MS = 35 * 60 * 1000  // 35 min — cron runs every 30 min

interface ByStage  { count: number; value: number }
interface Convo    { id: string; contactName: string; type: string; lastMessage: string; lastMessageDate: number; unreadCount: number }
interface Appt     { id: string; title: string; contactName?: string; calendarName: string; startTime: string; endTime: string; status?: string }
interface GhlPayload {
  fetchedAt: string
  pipeline: {
    open: number; won: number; lost: number
    open_value: number; won_value: number; total_value: number
    win_rate: number
    by_stage: Record<string, ByStage>
    pipelines: { id: string; name: string }[]
    source_breakdown?: Record<string, number>
  }
  recentLeads: {
    id: string; name: string; email?: string; phone?: string
    source?: string; dateAdded?: string; tags?: string[]
  }[]
  recentConversations?: Convo[]
  upcomingAppointments?: Appt[]
}

function readCache(): GhlPayload | null {
  try {
    const raw = readFileSync(CACHE_FILE, 'utf-8')
    const data: GhlPayload = JSON.parse(raw)
    const age = Date.now() - new Date(data.fetchedAt).getTime()
    if (age > CACHE_MAX_AGE_MS) return null
    return data
  } catch {
    return null
  }
}

// Source normalization — mirrors ghl_tool.py normalize_source()
const SOURCE_MAP: Record<string, string> = {
  thumbtack: 'Thumbtack', Thumbtack: 'Thumbtack',
  d2d: 'D2D', D2D: 'D2D', 'duvall d2d': 'D2D', 'Clint d2d': 'D2D', 'clint d2d': 'D2D',
  'clint referral': 'Referral', referral: 'Referral', Referral: 'Referral',
  'clint fb': 'Social', 'Clint FB': 'Social', facebook: 'Social', Facebook: 'Social',
  'Clint Reddit Comment': 'Reddit', reddit: 'Reddit',
  'Direct traffic': 'Direct', 'direct traffic': 'Direct', direct: 'Direct',
  'CRM UI': 'Manual', 'crm ui': 'Manual', Clint: 'Manual', clint: 'Manual', misty: 'Manual',
  quickbooks: 'QuickBooks', QuickBooks: 'QuickBooks',
  google: 'Google', Google: 'Google', 'google ads': 'Google Ads',
  organic: 'Organic', Organic: 'Organic',
  Other: 'Other', other: 'Other',
}
function normalizeSource(raw?: string): string {
  if (!raw) return 'Unknown'
  const s = raw.trim()
  return SOURCE_MAP[s] ?? SOURCE_MAP[s.toLowerCase()] ?? s
}

async function fetchLive(): Promise<GhlPayload | null> {
  const key = process.env.GHL_API_KEY
  const locationId = process.env.GHL_LOCATION_ID || '4DKapRFZCHMehBPjCKKU'
  if (!key) return null

  const headers = {
    Authorization: `Bearer ${key}`,
    Version: '2021-07-28',
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (compatible; evrnew-dashboard/1.0)',
  }
  const base = 'https://services.leadconnectorhq.com'

  try {
    const [pipeRes, oppRes, contactRes, convoRes] = await Promise.all([
      fetch(`${base}/opportunities/pipelines?locationId=${locationId}`, { headers, signal: AbortSignal.timeout(8000) }),
      fetch(`${base}/opportunities/search?location_id=${locationId}&limit=100`, { headers, signal: AbortSignal.timeout(8000) }),
      fetch(`${base}/contacts/?locationId=${locationId}&limit=100`, { headers, signal: AbortSignal.timeout(8000) }),
      fetch(`${base}/conversations/search?locationId=${locationId}&limit=20`, { headers, signal: AbortSignal.timeout(8000) }),
    ])

    if (!pipeRes.ok || !oppRes.ok || !contactRes.ok) return null

    const [pipeData, oppData, contactData] = await Promise.all([
      pipeRes.json(), oppRes.json(), contactRes.json(),
    ])
    const convoData = convoRes.ok ? await convoRes.json() : { conversations: [] }

    const pipelines: { id: string; name: string }[] = (pipeData.pipelines ?? []).map((p: Record<string, unknown>) => ({ id: p.id as string, name: p.name as string }))
    const stageNames: Record<string, string> = {}
    const pipelineNames: Record<string, string> = {}
    for (const p of pipeData.pipelines ?? []) {
      pipelineNames[p.id] = p.name
      for (const s of p.stages ?? []) stageNames[s.id] = s.name
    }

    const opps: Record<string, unknown>[] = oppData.opportunities ?? []
    const openOpps  = opps.filter(o => o.status === 'open')
    const wonOpps   = opps.filter(o => o.status === 'won')
    const lostOpps  = opps.filter(o => o.status === 'lost')
    const val = (arr: Record<string, unknown>[]) => arr.reduce((s, o) => s + (Number(o.monetaryValue) || 0), 0)

    const byStage: Record<string, ByStage> = {}
    for (const o of openOpps) {
      const sid   = o.pipelineStageId as string || ''
      const pid   = o.pipelineId as string || ''
      const stage = stageNames[sid] || sid || 'Unknown'
      const pipe  = pipelineNames[pid] || ''
      const key   = pipe ? `${pipe} › ${stage}` : stage
      if (!byStage[key]) byStage[key] = { count: 0, value: 0 }
      byStage[key].count++
      byStage[key].value += Number(o.monetaryValue) || 0
    }

    const sortedByStage = Object.fromEntries(
      Object.entries(byStage).sort(([, a], [, b]) => b.value - a.value).slice(0, 8)
    )

    // Source breakdown — normalize and count all contacts (not just 100)
    const contacts: Record<string, unknown>[] = contactData.contacts ?? []
    const sourceBreakdown: Record<string, number> = {}
    for (const c of contacts) {
      const src = normalizeSource(c.source as string | undefined)
      sourceBreakdown[src] = (sourceBreakdown[src] ?? 0) + 1
    }
    const sortedSources = Object.fromEntries(
      Object.entries(sourceBreakdown).sort(([, a], [, b]) => b - a).slice(0, 8)
    )

    const recentLeads = contacts.slice(0, 20).map(c => ({
      id:        c.id as string,
      name:      (c.contactName as string) || `${c.firstName || ''} ${c.lastName || ''}`.trim(),
      email:     c.email as string | undefined,
      phone:     c.phone as string | undefined,
      source:    normalizeSource(c.source as string | undefined),
      dateAdded: c.dateAdded as string | undefined,
      tags:      c.tags as string[] | undefined,
    }))

    // Recent conversations with actual messages
    const rawConvos: Record<string, unknown>[] = convoData.conversations ?? []
    const recentConversations: Convo[] = rawConvos
      .filter(c => c.lastMessageBody || c.lastMessage)
      .slice(0, 10)
      .map(c => ({
        id:              c.id as string,
        contactName:     (c.fullName || c.contactName) as string || 'Unknown',
        type:            (c.type as string || '').replace('TYPE_', ''),
        lastMessage:     ((c.lastMessageBody || c.lastMessage) as string || '').slice(0, 120),
        lastMessageDate: c.lastMessageDate as number || 0,
        unreadCount:     c.unreadCount as number || 0,
      }))

    return {
      fetchedAt: new Date().toISOString(),
      pipeline: {
        open:       openOpps.length,
        won:        wonOpps.length,
        lost:       lostOpps.length,
        open_value: Math.round(val(openOpps) * 100) / 100,
        won_value:  Math.round(val(wonOpps) * 100) / 100,
        total_value: Math.round(val(opps) * 100) / 100,
        win_rate:   wonOpps.length / Math.max(wonOpps.length + lostOpps.length, 1) * 100,
        by_stage:   sortedByStage,
        pipelines,
        source_breakdown: sortedSources,
      },
      recentLeads,
      recentConversations,
      upcomingAppointments: [],  // populated by Python cron when calendars have bookings
    }
  } catch {
    return null
  }
}

export async function GET() {
  const cached = readCache()
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' },
    })
  }

  const live = await fetchLive()
  if (!live) {
    return NextResponse.json({ error: 'GHL data unavailable' }, { status: 503 })
  }

  return NextResponse.json(live, {
    headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' },
  })
}
