'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { systemAgents } from '@/lib/data'
import { CANONICAL_LLM_STACK, LLM_OFF_HOT_PATH, LLM_STACK_UPDATED } from '@/lib/llm-stack'

// ── Types ─────────────────────────────────────────────────────────────────────
interface NodeMem { id: string; name: string; totalGB: number; usedGB: number; pct: number; gpuPct: number; pcpuPct: number; ecpuPct: number; tempC: number; powerW: number }
interface MemPoint  { time: string; pct: number; [key: string]: number | string }
interface NodePoint { time: string; [key: string]: number | string }
interface SysMetrics {
  ts: number; uptimeStr: string
  memory: { totalGB: number; usedGB: number; pct: number; clusterNodes: number; nodes: NodeMem[] }
  disk: { usedGB: number; totalGB: number; pct: number }
  load: { '1m': number; '5m': number; '15m': number }
  cpu: { model: string; count: number }
  gpu: { device: number; renderer: number; tiler: number; memUsedGB: number; memAllocGB: number; cores: number; model: string }
}
interface GpuPoint { time: string; device: number; renderer: number; tiler: number; memUsedGB: number }
interface CronJob {
  id: string; name: string; enabled: boolean; schedule?: string
  lastStatus?: string; lastRunAtMs?: number; nextRunAtMs?: number
  lastDurationMs?: number; consecutiveErrors?: number
}
interface GatewayData {
  ok: boolean; gatewayLatencyMs: number
  relayOk: boolean; relayLatencyMs: number
  cronJobs: CronJob[]
}
interface AgentLog { agent: string; lines: string[]; sizeKB: number; exists: boolean }
interface Service {
  name: string; key: string; category: string
  status: 'ok' | 'configured' | 'down' | 'unknown'
  latencyMs?: number; detail?: string
}
interface GhlStage { count: number; value: number }
interface GhlConvo { id: string; contactName: string; type: string; lastMessage: string; lastMessageDate: number; unreadCount: number }
interface GhlAppt  { id: string; title: string; contactName?: string; calendarName: string; startTime: string; endTime: string; status?: string }
interface GhlData {
  fetchedAt: string
  pipeline: {
    open: number; won: number; lost: number
    open_value: number; won_value: number; win_rate: number
    by_stage: Record<string, GhlStage>
    source_breakdown?: Record<string, number>
  }
  recentLeads: { id: string; name: string; email?: string; phone?: string; source?: string; dateAdded?: string }[]
  recentConversations?: GhlConvo[]
  upcomingAppointments?: GhlAppt[]
}


interface QbArBucket { count: number; total: number }
interface QbData {
  fetchedAt: string
  total_receivable: number
  total_payable: number
  weekly_payments_received: number
  bills_due_soon: number
  ar: { current: QbArBucket; '31-60': QbArBucket; '61-90': QbArBucket; '90+': QbArBucket }
  alerts: string[]
  _stale?: boolean
}

// ── Colors ────────────────────────────────────────────────────────────────────
const C = {
  bg:      '#f8fafc',
  surface: '#ffffff',
  border:  '#e2e8f0',
  accent:  '#0ea5e9',
  green:   '#16a34a',
  red:     '#dc2626',
  yellow:  '#d97706',
  purple:  '#7c3aed',
  text:    '#0f172a',
  muted:   '#64748b',
  dim:     '#cbd5e1',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtTime = (ms: number) => ms > 0
  ? new Date(ms).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
  : '—'
const relativeTime = (ms: number) => {
  if (!ms) return '—'
  const diff = (Date.now() - ms) / 1000
  if (diff < 60)  return `${Math.round(diff)}s ago`
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`
  return `${Math.round(diff / 3600)}h ago`
}
const statusColor = (s?: string, errors?: number) => {
  if ((errors ?? 0) > 0) return C.red
  if (s === 'ok') return C.green
  if (s === 'error') return C.red
  return C.yellow
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = C.accent, loading = false }: {
  label: string; value: string; sub?: string; color?: string; loading?: boolean
}) {
  return (
    <div className="mc-card" style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <div className="mc-label">{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: loading ? C.dim : color, letterSpacing: '-0.03em', transition: 'color 0.3s' }}>
        {loading ? '···' : value}
      </div>
      {sub && <div style={{ fontSize: 10, color: C.muted }}>{sub}</div>}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="mc-section-title">{children}</div>
}

function StatusDot({ status }: { status: 'ok' | 'configured' | 'down' | 'unknown' }) {
  const color = status === 'ok' ? C.green : status === 'configured' ? C.accent : status === 'down' ? C.red : C.dim
  return <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
}

function StatusPill({ ok, label, latency, detail }: { ok?: boolean; label: string; latency?: number; detail?: string }) {
  const isUp   = ok === true
  const isDown = ok === false
  const bg     = isDown ? '#fef2f2' : isUp ? '#f0fdf4' : '#f8fafc'
  const border = isDown ? '#fecaca' : isUp ? '#bbf7d0' : '#e2e8f0'
  const color  = isDown ? '#dc2626' : isUp ? '#16a34a' : '#94a3b8'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '4px 10px' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: ok == null ? '#cbd5e1' : color, display: 'inline-block', animation: isUp ? 'pulse 2s infinite' : 'none' }} />
      <span style={{ fontSize: 9, color: ok == null ? '#94a3b8' : color, fontWeight: 600, letterSpacing: '0.05em' }}>
        {label}
      </span>
      {latency != null && isUp && <span style={{ fontSize: 8, color: '#86efac' }}>{latency}ms</span>}
      {detail && <span style={{ fontSize: 8, color: color, opacity: 0.7 }}>{detail}</span>}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: Record<string, unknown>) => {
  if (!active || !Array.isArray(payload) || !payload.length) return null
  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 4, padding: '6px 10px', fontSize: 10, color: '#0f172a', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
      <div style={{ color: '#64748b', marginBottom: 2 }}>{label as string}</div>
      {payload.map((p: Record<string, unknown>, i: number) => (
        <div key={i} style={{ color: p.color as string }}>
          {String(p.name)}: <strong>{String(p.value)}{String(p.name) === 'mem' ? '%' : ''}</strong>
        </div>
      ))}
    </div>
  )
}

const CATEGORY_LABELS: Record<string, string> = {
  infra:     'Infrastructure',
  ai:        'AI & ML',
  seo:       'SEO & Analytics',
  marketing: 'Marketing & Ads',
  comm:      'Communication',
}

// Agent display names
const AGENT_META: Record<string, { label: string; desc: string }> = {
  'ads':           { label: 'Google Ads Agent',     desc: 'Campaign optimization' },
  'blog-seo':      { label: 'Blog SEO Agent',       desc: 'Content + SEO writing' },
  'competitive':   { label: 'Competitive Intel',    desc: 'Competitor monitoring' },
  'content':       { label: 'Content Agent',        desc: 'Landing pages + email' },
  'email-drip':    { label: 'Email Drip Agent',     desc: 'Sequence automation' },
  'social':        { label: 'Social Agent',         desc: 'FB / IG / Google Biz' },
  'strategy':      { label: 'Strategy Agent',       desc: 'Market analysis' },
  'technical-seo': { label: 'Technical SEO Agent',  desc: 'Site audits + fixes' },
}

const agentsByKey = Object.fromEntries(
  systemAgents.map(a => [
    (a.plist ?? '').replace('com.evrnew.agent-', ''),
    a,
  ]),
)

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MissionControl() {
  const [sysMetrics, setSysMetrics]   = useState<SysMetrics | null>(null)
  const [memHistory, setMemHistory]   = useState<MemPoint[]>([])
  const [gpuHistory, setGpuHistory]   = useState<GpuPoint[]>([])
  const [nodeGpuHistory, setNodeGpuHistory] = useState<NodePoint[]>([])
  const [nodeCpuHistory, setNodeCpuHistory] = useState<NodePoint[]>([])
  const [gateway, setGateway]         = useState<GatewayData | null>(null)
  const [agentLogs, setAgentLogs]     = useState<{ agents: AgentLog[]; gatewayLines: string[] } | null>(null)
  const [integrations, setIntegrations] = useState<Service[]>([])
  const [telegramSvc, setTelegramSvc] = useState<Service | null>(null)
const [ghlData, setGhlData]     = useState<GhlData | null>(null)
  const [qbData,  setQbData]      = useState<QbData | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  const pollMetrics = useCallback(async () => {
    try {
      const r = await fetch('/api/system-metrics', { cache: 'no-store' })
      const d: SysMetrics = await r.json()
      setSysMetrics(d)
      const t = new Date(d.ts).toLocaleTimeString('en-US', { hour12: false }).slice(0, 8)
      const memPoint: MemPoint = { time: t, pct: d.memory.pct }
      for (const n of d.memory.nodes ?? []) {
        memPoint[n.name] = n.pct
      }
      setMemHistory(prev => [...prev, memPoint].slice(-72))
      if (d.gpu) {
        setGpuHistory(prev => [...prev, {
          time: t,
          device:    d.gpu.device,
          renderer:  d.gpu.renderer,
          tiler:     d.gpu.tiler,
          memUsedGB: d.gpu.memUsedGB,
        }].slice(-72))
      }
      // Always build GPU/CPU history - use all nodes if available, else master-only fallback
      const gpuPt: NodePoint = { time: t }
      const cpuPt: NodePoint = { time: t }
      if (d.memory.nodes?.length) {
        for (const n of d.memory.nodes) {
          const label = n.name.split("'")[0].split("'")[0]  // normalize both apostrophe types
          const isMaster = label.toLowerCase().includes('master')
          gpuPt[label] = isMaster && d.gpu ? d.gpu.device : n.gpuPct
          cpuPt[label] = Math.round((n.pcpuPct + n.ecpuPct) / 2)
        }
      } else {
        // Fallback: master only from powermetrics
        gpuPt['erel_master'] = d.gpu?.device ?? 0
        cpuPt['erel_master'] = d.load?.['1m'] ? Math.min(100, Math.round(d.load['1m'] / (d.cpu?.count ?? 18) * 100)) : 0
      }
      setNodeGpuHistory(prev => [...prev, gpuPt].slice(-72))
      setNodeCpuHistory(prev => [...prev, cpuPt].slice(-72))
    } catch {}
  }, [])

  const pollGateway = useCallback(async () => {
    try {
      const r = await fetch('/api/gateway-health', { cache: 'no-store' })
      const d: GatewayData = await r.json()
      setGateway(d)
    } catch {}
  }, [])

  const pollLogs = useCallback(async () => {
    try {
      const r = await fetch('/api/agent-logs', { cache: 'no-store' })
      const d = await r.json()
      setAgentLogs(d)
      setTimeout(() => {
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
      }, 50)
    } catch {}
  }, [])

  const pollIntegrations = useCallback(async () => {
    try {
      const r = await fetch('/api/integrations', { cache: 'no-store' })
      const d = await r.json()
      const svcs: Service[] = d.services || []
      setIntegrations(svcs)
      const tg = svcs.find(s => s.key === 'telegram')
      if (tg) setTelegramSvc(tg)
    } catch {}
  }, [])

const pollGhl = useCallback(async () => {
    try {
      const r = await fetch('/api/ghl', { cache: 'no-store' })
      if (r.ok) { const d: GhlData = await r.json(); setGhlData(d) }
    } catch {}
  }, [])

  const pollQb = useCallback(async () => {
    try {
      const r = await fetch('/api/qb', { cache: 'no-store' })
      if (r.ok) { const d: QbData = await r.json(); if (!d.error) setQbData(d) }
    } catch {}
  }, [])

  useEffect(() => { pollMetrics();     const t = setInterval(pollMetrics, 5000);      return () => clearInterval(t) }, [pollMetrics])
  useEffect(() => { pollGateway();     const t = setInterval(pollGateway, 8000);      return () => clearInterval(t) }, [pollGateway])
  useEffect(() => { pollLogs();        const t = setInterval(pollLogs, 12000);        return () => clearInterval(t) }, [pollLogs])
  useEffect(() => { pollIntegrations();const t = setInterval(pollIntegrations, 20000); return () => clearInterval(t) }, [pollIntegrations])
useEffect(() => { pollGhl();         const t = setInterval(pollGhl, 120000);        return () => clearInterval(t) }, [pollGhl])
  useEffect(() => { pollQb();          const t = setInterval(pollQb,  120000);        return () => clearInterval(t) }, [pollQb])

  // ── Derived ──────────────────────────────────────────────────────────────
  const cronChartData = (gateway?.cronJobs || []).map(j => ({
    name: (j.name || '').replace('-', '\n').slice(0, 14),
    fullName: j.name,
    durationMs: j.lastDurationMs || 0,
    status: j.lastStatus || 'unknown',
    errors: j.consecutiveErrors || 0,
  }))

  const allLogLines = [
    ...(agentLogs?.gatewayLines?.slice(-10) || []).map(l => ({ src: 'gateway', line: l })),
    ...(agentLogs?.agents || []).flatMap(a =>
      (a.lines || []).slice(-3).map(l => ({ src: a.agent, line: l }))
    ),
  ]

  const loading = !sysMetrics
  const mem  = sysMetrics?.memory
  const disk = sysMetrics?.disk
  const cronOkCount = (gateway?.cronJobs || []).filter(j => j.lastStatus === 'ok').length
  const cronTotal   = (gateway?.cronJobs || []).length
  const intOkCount  = integrations.filter(s => s.status === 'ok' || s.status === 'configured').length
  const intTotal    = integrations.length

  // Build agent cards: merge cron jobs data with log sizes
  const agentNames = Object.keys(AGENT_META)
  const agentCards = agentNames.map(name => {
    const log  = agentLogs?.agents.find(a => a.agent === name)
    const cron = gateway?.cronJobs?.find(j => j.name?.toLowerCase().includes(name.replace('-', '')) ||
      j.name?.toLowerCase().includes(name.split('-')[0]))
    const meta = AGENT_META[name]
    const fleet = agentsByKey[name]
    return { name, meta, log, cron, fleet }
  })

  // Group integrations by category
  const grouped: Record<string, Service[]> = {}
  for (const svc of integrations) {
    const cat = svc.category || 'other'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(svc)
  }

  return (
    <div style={{ padding: '20px 24px 40px', maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: '0.2em', color: C.muted, textTransform: 'uppercase', marginBottom: 4 }}>
            EREL.AI · Evrnew LLC
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: '-0.02em', lineHeight: 1 }}>
            Mission Control
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <StatusPill ok={gateway?.ok}      label="Gateway"  latency={gateway?.gatewayLatencyMs} />
          <StatusPill ok={gateway?.relayOk} label="Relay"    latency={gateway?.relayLatencyMs} />
          <StatusPill
            ok={telegramSvc ? telegramSvc.status === 'ok' : undefined}
            label="Telegram Bot"
            latency={telegramSvc?.latencyMs}
            detail={telegramSvc?.detail}
          />
          <StatusPill ok={agentNames.length > 0} label={`${agentNames.length} Agents`} />
        </div>
      </div>

      {/* ── LLM Stack (2026-05) ── */}
      <div className="mc-card" style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
          <SectionTitle>LLM Stack — {LLM_STACK_UPDATED}</SectionTitle>
          <Link href="/system" style={{ fontSize: 10, color: C.accent, textDecoration: 'none' }}>
            Full registry →
          </Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
          {CANONICAL_LLM_STACK.map(row => (
            <div key={row.role} style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 10px', background: '#fafcff' }}>
              <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted, fontWeight: 700, marginBottom: 4 }}>
                {row.role}
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.purple, fontFamily: 'monospace' }}>{row.model}</div>
              <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{row.endpoint}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 9, color: C.muted, marginTop: 10 }}>{LLM_OFF_HOT_PATH}</p>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <StatCard
          label="Memory"
          value={mem ? `${mem.pct}%` : '···'}
          sub={mem ? `${mem.usedGB} / ${mem.totalGB} GB used` : 'loading...'}
          color={mem ? (mem.pct > 85 ? C.red : mem.pct > 70 ? C.yellow : C.green) : C.dim}
          loading={loading}
        />
        <StatCard
          label="Disk"
          value={disk ? `${disk.pct}%` : '···'}
          sub={disk ? `${disk.usedGB} GB / ${disk.totalGB} GB` : 'loading...'}
          color={disk ? (disk.pct > 80 ? C.red : C.accent) : C.dim}
          loading={loading}
        />
        <StatCard
          label="System Load"
          value={sysMetrics ? `${sysMetrics.load['1m']}` : '···'}
          sub={sysMetrics ? `5m ${sysMetrics.load['5m']} · uptime ${sysMetrics.uptimeStr} · master` : 'loading...'}
          color={sysMetrics ? (sysMetrics.load['1m'] > 4 ? C.red : sysMetrics.load['1m'] > 2 ? C.yellow : C.accent) : C.dim}
          loading={loading}
        />
        <StatCard
          label="Integrations"
          value={intTotal ? `${intOkCount}/${intTotal}` : '···'}
          sub={cronTotal ? `${cronOkCount}/${cronTotal} cron jobs ok` : 'loading...'}
          color={intTotal && intOkCount === intTotal ? C.green : C.yellow}
          loading={integrations.length === 0}
        />
      </div>

      <div id="live-charts" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* ── Charts Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
        <div className="mc-card">
          <SectionTitle>Cluster Memory % — Live (5-sec intervals)</SectionTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: mem ? (mem.pct > 85 ? C.red : mem.pct > 70 ? C.yellow : C.green) : C.dim, letterSpacing: '-0.03em' }}>
              {mem ? `${mem.pct}%` : '—'}
            </span>
            <span style={{ fontSize: 10, color: C.muted }}>{mem ? `${mem.usedGB} GB used of ${mem.totalGB} GB` : ''}</span>
          </div>
          {/* Per-node breakdown */}
          {mem && mem.nodes && mem.nodes.length > 0 && (
            <div style={{ display: 'flex', gap: 16, marginBottom: 6 }}>
              {mem.nodes.map((n, i) => (
                <span key={n.id} style={{ fontSize: 9, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 10, height: 2, background: i === 0 ? C.accent : C.green, display: 'inline-block', borderRadius: 1 }} />
                  {n.name.split("'")[0]}: {n.pct}% ({n.usedGB}G)
                </span>
              ))}
            </div>
          )}
          {memHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={memHistory} margin={{ top: 2, right: 2, bottom: 0, left: -28 }}>
                <defs>
                  <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.accent} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={C.accent} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="memGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.green} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={C.green} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: C.muted, fontSize: 8 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fill: C.muted, fontSize: 8 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                {/* If per-node data present, show individual lines; else aggregate */}
                {sysMetrics?.memory?.nodes?.length ? (
                  sysMetrics.memory.nodes.map((n, i) => (
                    <Area key={n.id} type="monotone" dataKey={n.name} name={n.name.split("'")[0]}
                      stroke={i === 0 ? C.accent : C.green} strokeWidth={1.5}
                      fill={`url(#${i === 0 ? 'memGrad' : 'memGrad2'})`} dot={false} isAnimationActive={false} />
                  ))
                ) : (
                  <Area type="monotone" dataKey="pct" name="Cluster" stroke={C.accent} strokeWidth={1.5} fill="url(#memGrad)" dot={false} isAnimationActive={false} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 10 }}>collecting data...</div>
          )}
        </div>

        <div className="mc-card">
          <SectionTitle>Cron Jobs — Last Run Duration</SectionTitle>
          <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: C.muted }}>
              <span style={{ color: C.green }}>■</span> ok &nbsp;
              <span style={{ color: C.red }}>■</span> error &nbsp;
              <span style={{ color: C.yellow }}>■</span> unknown
            </span>
          </div>
          {cronChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={cronChartData} margin={{ top: 2, right: 2, bottom: 60, left: -28 }}>
                <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 8 }} tickLine={false} axisLine={false} angle={-90} textAnchor="end" interval={0} />
                <YAxis tick={{ fill: C.muted, fontSize: 8 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}ms`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="durationMs" name="duration" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                  {cronChartData.map((e, i) => (
                    <Cell key={i} fill={e.errors > 0 ? C.red : e.status === 'ok' ? C.green : e.status === 'error' ? C.red : C.yellow} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 10 }}>loading cron data...</div>
          )}
        </div>
      </div>

      {/* ── GPU + CPU Charts ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
        {/* GPU Utilization — per node from MLX metrics */}
        <div className="mc-card">
          <SectionTitle>GPU Utilization % — Cluster — Live (5-sec intervals)</SectionTitle>
          <div style={{ display: 'flex', gap: 16, marginBottom: 6 }}>
            {(sysMetrics?.memory?.nodes ?? []).map((n, i) => {
              const label = n.name.split("'")[0]
              const color = i === 0 ? C.purple : C.green
              return (
                <span key={n.id} style={{ fontSize: 9, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 10, height: 2, background: color, display: 'inline-block', borderRadius: 1 }} />
                  {label}: {n.gpuPct}%
                </span>
              )
            })}
          </div>
          {nodeGpuHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={nodeGpuHistory} margin={{ top: 2, right: 2, bottom: 0, left: -28 }}>
                <defs>
                  <linearGradient id="gpuN0Grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.purple} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={C.purple} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gpuN1Grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.green} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={C.green} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: C.muted, fontSize: 8 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fill: C.muted, fontSize: 8 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                {(sysMetrics?.memory?.nodes ?? []).map((n, i) => {
                  const label = n.name.split("'")[0]
                  return <Area key={n.id} type="monotone" dataKey={label} name={label}
                    stroke={i === 0 ? C.purple : C.green} strokeWidth={1.5}
                    fill={`url(#gpuN${i}Grad)`} dot={false} isAnimationActive={false} />
                })}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 10 }}>collecting data...</div>
          )}
        </div>

        {/* CPU Utilization — per node from MLX metrics */}
        <div className="mc-card">
          <SectionTitle>CPU Utilization % — Cluster — Live (5-sec intervals)</SectionTitle>
          <div style={{ display: 'flex', gap: 16, marginBottom: 6 }}>
            {(sysMetrics?.memory?.nodes ?? []).map((n, i) => {
              const label = n.name.split("'")[0]
              const color = i === 0 ? C.accent : C.yellow
              return (
                <span key={n.id} style={{ fontSize: 9, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 10, height: 2, background: color, display: 'inline-block', borderRadius: 1 }} />
                  {label}: {Math.round((n.pcpuPct + n.ecpuPct) / 2)}%
                </span>
              )
            })}
          </div>
          {nodeCpuHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={nodeCpuHistory} margin={{ top: 2, right: 2, bottom: 0, left: -28 }}>
                <defs>
                  <linearGradient id="cpuN0Grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.accent} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={C.accent} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="cpuN1Grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.yellow} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={C.yellow} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: C.muted, fontSize: 8 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fill: C.muted, fontSize: 8 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                {(sysMetrics?.memory?.nodes ?? []).map((n, i) => {
                  const label = n.name.split("'")[0]
                  return <Area key={n.id} type="monotone" dataKey={label} name={label}
                    stroke={i === 0 ? C.accent : C.yellow} strokeWidth={1.5}
                    fill={`url(#cpuN${i}Grad)`} dot={false} isAnimationActive={false} />
                })}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 10 }}>collecting data...</div>
          )}
        </div>
      </div>

      {/* ── Neural Engine & GPU Memory (Master — powermetrics detail) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
        <div className="mc-card">
          <SectionTitle>Neural Engine & GPU Memory — Master — Live</SectionTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: C.green, letterSpacing: '-0.03em' }}>
              {sysMetrics?.gpu ? `${sysMetrics.gpu.memUsedGB}G` : '—'}
            </span>
            <span style={{ fontSize: 10, color: C.muted }}>
              {sysMetrics?.gpu ? `of ${sysMetrics.gpu.memAllocGB}G alloc · ANE 16-core 38 TOPS` : ''}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 8, background: '#f0fdf4', border: `1px solid #bbf7d0`, color: C.green, fontWeight: 600, letterSpacing: '0.06em' }}>
              ANE PRESENT
            </span>
            <span style={{ fontSize: 9, color: C.muted }}>{sysMetrics?.gpu?.model ?? 'Apple M5 Pro'} · Metal4</span>
          </div>
          {gpuHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={gpuHistory} margin={{ top: 2, right: 2, bottom: 0, left: -28 }}>
                <defs>
                  <linearGradient id="gpuMemGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.green} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={C.green} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: C.muted, fontSize: 8 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: C.muted, fontSize: 8 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}G`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="memUsedGB" name="GPU Mem GB" stroke={C.green} strokeWidth={1.5} fill="url(#gpuMemGrad)" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 10 }}>collecting data...</div>
          )}
        </div>
        <div />
      </div>

      </div>

      {/* ── GHL CRM Panel ── */}
      <div className="mc-card" style={{ padding: '14px 16px' }}>
        <SectionTitle>GHL CRM — Pipeline &amp; Leads</SectionTitle>

        {/* Top stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.muted, fontWeight: 700 }}>Open Deals</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: C.accent, letterSpacing: '-0.03em' }}>{ghlData ? ghlData.pipeline.open : '···'}</div>
            <div style={{ fontSize: 10, color: C.muted }}>{ghlData ? `$${ghlData.pipeline.open_value.toLocaleString(undefined, { maximumFractionDigits: 0 })} pipeline` : ''}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.muted, fontWeight: 700 }}>Won</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: C.green, letterSpacing: '-0.03em' }}>{ghlData ? ghlData.pipeline.won : '···'}</div>
            <div style={{ fontSize: 10, color: C.muted }}>{ghlData ? `$${ghlData.pipeline.won_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : ''}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.muted, fontWeight: 700 }}>Win Rate</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: C.purple, letterSpacing: '-0.03em' }}>{ghlData ? `${ghlData.pipeline.win_rate.toFixed(0)}%` : '···'}</div>
            <div style={{ fontSize: 10, color: C.muted }}>{ghlData ? `${ghlData.pipeline.won + ghlData.pipeline.lost} closed` : ''}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.muted, fontWeight: 700 }}>Recent Leads (7d)</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: C.yellow, letterSpacing: '-0.03em' }}>{ghlData ? ghlData.recentLeads.length : '···'}</div>
            <div style={{ fontSize: 10, color: C.muted }}>{ghlData ? `updated ${new Date(ghlData.fetchedAt).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}` : ''}</div>
          </div>
        </div>

        {/* Two-column: Stage breakdown + Source breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 14 }}>

          {/* Stage breakdown */}
          {ghlData && Object.keys(ghlData.pipeline.by_stage).length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.muted, fontWeight: 700, marginBottom: 2 }}>By Stage</div>
              {Object.entries(ghlData.pipeline.by_stage).sort(([, a], [, b]) => b.value - a.value).map(([stage, data]) => {
                const maxVal = Math.max(...Object.values(ghlData.pipeline.by_stage).map(d => d.value), 1)
                const barPct = data.value > 0 ? Math.max(4, Math.round(data.value / maxVal * 100)) : 4
                const shortStage = stage.includes(' › ') ? stage.split(' › ')[1] : stage
                return (
                  <div key={stage} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 60px 52px', gap: 6, alignItems: 'center', fontSize: 10 }}>
                    <div style={{ color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={stage}>{shortStage}</div>
                    <div style={{ height: 5, background: C.border, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${barPct}%`, background: data.value > 0 ? C.accent : C.dim, borderRadius: 3, transition: 'width 0.4s ease' }} />
                    </div>
                    <div style={{ color: C.muted, textAlign: 'right' }}>{data.count} deal{data.count !== 1 ? 's' : ''}</div>
                    <div style={{ color: data.value > 0 ? C.text : C.dim, textAlign: 'right', fontWeight: 500 }}>
                      {data.value > 0 ? `$${(data.value / 1000).toFixed(0)}k` : '—'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Source breakdown */}
          {ghlData?.pipeline.source_breakdown && Object.keys(ghlData.pipeline.source_breakdown).length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.muted, fontWeight: 700, marginBottom: 2 }}>Lead Sources (30d)</div>
              {Object.entries(ghlData.pipeline.source_breakdown).map(([src, cnt]) => {
                const total = Object.values(ghlData.pipeline.source_breakdown!).reduce((a, b) => a + b, 0)
                const pct   = Math.max(4, Math.round(cnt / Math.max(total, 1) * 100))
                const srcColor = src === 'D2D' ? C.green : src === 'Thumbtack' ? C.accent : src === 'Direct' ? C.purple : src === 'QuickBooks' ? C.yellow : C.muted
                return (
                  <div key={src} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 32px', gap: 6, alignItems: 'center', fontSize: 10 }}>
                    <div style={{ color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{src}</div>
                    <div style={{ height: 5, background: C.border, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: srcColor, borderRadius: 3, transition: 'width 0.4s ease', opacity: 0.8 }} />
                    </div>
                    <div style={{ color: C.muted, textAlign: 'right' }}>{cnt}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent conversations */}
        {ghlData?.recentConversations && ghlData.recentConversations.length > 0 && (
          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.muted, fontWeight: 700, marginBottom: 6 }}>Recent Conversations</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {ghlData.recentConversations.slice(0, 6).map(c => (
                <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 50px', gap: 8, alignItems: 'center', fontSize: 10, padding: '4px 0', borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {c.unreadCount > 0 && <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.accent, flexShrink: 0, display: 'inline-block' }} />}
                    <span style={{ color: c.unreadCount > 0 ? C.text : C.muted, fontWeight: c.unreadCount > 0 ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.contactName}</span>
                  </div>
                  <div style={{ color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.lastMessage}</div>
                  <div style={{ color: C.dim, textAlign: 'right', fontSize: 9 }}>{c.lastMessageDate ? relativeTime(c.lastMessageDate) : ''}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── QB Finance Panel ── */}
      <div className="mc-card" style={{ padding: '14px 16px' }}>
        <SectionTitle>QuickBooks — Financials{qbData?._stale ? ' (stale)' : ''}</SectionTitle>

        {/* Stat row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.muted, fontWeight: 700 }}>Total AR</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: C.accent, letterSpacing: '-0.03em' }}>{qbData ? `$${(qbData.total_receivable / 1000).toFixed(1)}k` : '···'}</div>
            <div style={{ fontSize: 10, color: C.muted }}>{qbData ? 'receivable' : ''}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.muted, fontWeight: 700 }}>Total AP</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: C.red, letterSpacing: '-0.03em' }}>{qbData ? `$${(qbData.total_payable / 1000).toFixed(1)}k` : '···'}</div>
            <div style={{ fontSize: 10, color: C.muted }}>{qbData && qbData.bills_due_soon > 0 ? `${qbData.bills_due_soon} due soon` : qbData ? 'none due' : ''}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.muted, fontWeight: 700 }}>7-Day Collected</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: C.green, letterSpacing: '-0.03em' }}>{qbData ? `$${(qbData.weekly_payments_received / 1000).toFixed(1)}k` : '···'}</div>
            <div style={{ fontSize: 10, color: C.muted }}>{qbData ? 'last 7 days' : ''}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.muted, fontWeight: 700 }}>90+ Overdue</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: qbData && qbData.ar?.['90+']?.total > 0 ? C.red : C.dim, letterSpacing: '-0.03em' }}>{qbData ? `$${((qbData.ar?.['90+']?.total ?? 0) / 1000).toFixed(1)}k` : '···'}</div>
            <div style={{ fontSize: 10, color: C.muted }}>{qbData ? `updated ${new Date(qbData.fetchedAt).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}` : ''}</div>
          </div>
        </div>

        {/* AR Aging bars */}
        {qbData?.ar && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
            <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.muted, fontWeight: 700, marginBottom: 2 }}>AR Aging</div>
            {(Object.entries(qbData.ar) as [string, QbArBucket][]).map(([bucket, data]) => {
              const maxVal = Math.max(...(Object.values(qbData.ar!) as QbArBucket[]).map(d => d.total), 1)
              const barPct = data.total > 0 ? Math.max(4, Math.round(data.total / maxVal * 100)) : 0
              const barColor = bucket === 'current' ? C.green : bucket === '31-60' ? C.yellow : C.red
              return (
                <div key={bucket} style={{ display: 'grid', gridTemplateColumns: '72px 1fr 48px 56px', gap: 6, alignItems: 'center', fontSize: 10 }}>
                  <div style={{ color: C.text }}>{bucket}</div>
                  <div style={{ height: 5, background: C.border, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${barPct}%`, background: data.total > 0 ? barColor : C.dim, borderRadius: 3, transition: 'width 0.4s ease' }} />
                  </div>
                  <div style={{ color: C.muted, textAlign: 'right' }}>{data.count} inv</div>
                  <div style={{ color: data.total > 0 ? C.text : C.dim, textAlign: 'right', fontWeight: 500 }}>{data.total > 0 ? `$${(data.total / 1000).toFixed(1)}k` : '—'}</div>
                </div>
              )
            })}
          </div>
        )}

        {/* Alerts */}
        {qbData?.alerts && qbData.alerts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.muted, fontWeight: 700, marginBottom: 2 }}>Alerts</div>
            {qbData.alerts.map((alert, i) => (
              <div key={i} style={{ fontSize: 10, color: C.yellow, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span>&#9888;</span> {alert}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Agents & Bots ── */}
      <div className="mc-card">
        <SectionTitle>Agents & Bots ({agentNames.length} Python agents · Gateway · Telegram Bot)</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10, marginTop: 8 }}>
          {agentCards.map(({ name, meta, log, cron, fleet }) => {
            const hasErr   = (cron?.consecutiveErrors ?? 0) > 0
            const dotColor = !log?.exists ? C.dim : hasErr ? C.red : cron?.lastStatus === 'ok' ? C.green : log.sizeKB > 0 ? C.accent : C.dim
            return (
              <div key={name} style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 12px', background: '#fafcff', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{meta.label}</span>
                </div>
                <div style={{ fontSize: 9, color: C.muted }}>{meta.desc}</div>
                {fleet?.llm && (
                  <div style={{ fontSize: 9, color: C.purple, fontFamily: 'monospace' }}>{fleet.llm}</div>
                )}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 9, color: C.muted }}>
                    Last: <span style={{ color: C.text }}>{cron?.lastRunAtMs ? relativeTime(cron.lastRunAtMs) : '—'}</span>
                  </span>
                  <span style={{ fontSize: 9, color: C.muted }}>
                    Next: <span style={{ color: C.text }}>{cron?.nextRunAtMs ? fmtTime(cron.nextRunAtMs) : '—'}</span>
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {cron?.lastStatus && (
                    <span style={{ fontSize: 8, padding: '1px 6px', borderRadius: 8, background: hasErr ? '#fef2f2' : cron.lastStatus === 'ok' ? '#f0fdf4' : '#fffbeb', color: statusColor(cron.lastStatus, cron.consecutiveErrors), fontWeight: 600, border: `1px solid currentColor`, opacity: 0.8 }}>
                      {cron.lastStatus}
                    </span>
                  )}
                  {(cron?.consecutiveErrors ?? 0) > 0 && (
                    <span style={{ fontSize: 8, color: C.red }}>{cron?.consecutiveErrors} errors</span>
                  )}
                  <span style={{ fontSize: 9, color: C.muted, marginLeft: 'auto' }}>
                    {log?.sizeKB ? `${log.sizeKB}KB log` : 'no log'}
                  </span>
                </div>
              </div>
            )
          })}

          {/* Gateway Bot card */}
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 12px', background: '#fafcff', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: gateway?.ok ? C.green : C.red, display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: C.text }}>OpenClaw Gateway</span>
            </div>
            <div style={{ fontSize: 9, color: C.muted }}>Browser automation · DM routing</div>
            <div style={{ fontSize: 9, color: C.purple, fontFamily: 'monospace' }}>grok-3</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{ fontSize: 9, color: C.muted }}>Port: <span style={{ color: C.text }}>18789</span></span>
              <span style={{ fontSize: 9, color: C.muted }}>Relay: <span style={{ color: C.text }}>18792</span></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {gateway?.gatewayLatencyMs != null && (
                <span style={{ fontSize: 8, color: C.green }}>{gateway.gatewayLatencyMs}ms</span>
              )}
              <span style={{ fontSize: 8, padding: '1px 6px', borderRadius: 8, background: gateway?.ok ? '#f0fdf4' : '#fef2f2', color: gateway?.ok ? C.green : C.red, fontWeight: 600, border: '1px solid currentColor', opacity: 0.8 }}>
                {gateway?.ok ? 'running' : 'down'}
              </span>
            </div>
          </div>

          {/* Telegram Bot card */}
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 12px', background: '#fafcff', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: telegramSvc?.status === 'ok' ? C.green : telegramSvc?.status === 'down' ? C.red : C.dim, display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: C.text }}>Telegram Bot</span>
            </div>
            <div style={{ fontSize: 9, color: C.muted }}>@theErelBot · Spencer DMs · Group alerts</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {telegramSvc?.detail && (
                <span style={{ fontSize: 9, color: C.text }}>{telegramSvc.detail}</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {telegramSvc?.latencyMs != null && (
                <span style={{ fontSize: 8, color: C.green }}>{telegramSvc.latencyMs}ms</span>
              )}
              <span style={{ fontSize: 8, padding: '1px 6px', borderRadius: 8, background: telegramSvc?.status === 'ok' ? '#f0fdf4' : '#fef2f2', color: telegramSvc?.status === 'ok' ? C.green : C.muted, fontWeight: 600, border: '1px solid currentColor', opacity: 0.8 }}>
                {telegramSvc?.status ?? '···'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Cron Job Table ── */}
      {gateway?.cronJobs?.length ? (
        <div className="mc-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px 10px' }}>
            <SectionTitle>Scheduled Jobs ({cronOkCount}/{cronTotal} ok)</SectionTitle>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {['Job', 'Status', 'Last Run', 'Duration', 'Next Run', 'Errors'].map(h => (
                    <th key={h} style={{ padding: '6px 14px', textAlign: 'left', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gateway.cronJobs.map((j, i) => {
                  const isOk  = j.lastStatus === 'ok'
                  const isErr = j.lastStatus === 'error' || (j.consecutiveErrors ?? 0) > 0
                  return (
                    <tr key={j.id} style={{ borderBottom: i < gateway.cronJobs.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                      <td style={{ padding: '8px 14px', color: C.text }}>{j.name}</td>
                      <td style={{ padding: '8px 14px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: isErr ? '#fff1f2' : isOk ? '#f0fdf4' : '#fffbeb', border: `1px solid ${isErr ? '#fecaca' : isOk ? '#bbf7d0' : '#fde68a'}`, borderRadius: 10, padding: '2px 8px', fontSize: 9, letterSpacing: '0.08em', color: isErr ? C.red : isOk ? C.green : C.yellow, fontWeight: 600 }}>
                          <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                          {j.lastStatus || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '8px 14px', color: C.muted, fontSize: 10 }}>{relativeTime(j.lastRunAtMs || 0)}</td>
                      <td style={{ padding: '8px 14px', color: C.muted, fontSize: 10 }}>{j.lastDurationMs ? `${j.lastDurationMs}ms` : '—'}</td>
                      <td style={{ padding: '8px 14px', color: C.muted, fontSize: 10 }}>{fmtTime(j.nextRunAtMs || 0)}</td>
                      <td style={{ padding: '8px 14px', color: (j.consecutiveErrors ?? 0) > 0 ? C.red : C.muted, fontSize: 10 }}>{j.consecutiveErrors ?? 0}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* ── Integrations by Category ── */}
      {integrations.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="mc-card" style={{ padding: '14px 16px 8px' }}>
            <SectionTitle>Services & Integrations ({intOkCount}/{intTotal} active)</SectionTitle>
          </div>
          {Object.entries(CATEGORY_LABELS).map(([catKey, catLabel]) => {
            const svcs = grouped[catKey]
            if (!svcs?.length) return null
            return (
              <div key={catKey} className="mc-card">
                <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.muted, fontWeight: 700, marginBottom: 8 }}>{catLabel}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 6 }}>
                  {svcs.map((svc) => (
                    <div key={svc.key} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', background: '#f8fafc', border: `1px solid ${C.border}`, borderRadius: 5 }}>
                      <StatusDot status={svc.status} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 10, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{svc.name}</div>
                        <div style={{ fontSize: 8, color: C.muted }}>
                          {svc.latencyMs != null ? `${svc.latencyMs}ms` : svc.status === 'configured' ? 'key set' : svc.status}
                          {svc.detail ? ` · ${svc.detail}` : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Log Feed + Agent Status ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="mc-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <SectionTitle>Live Log Feed</SectionTitle>
          <div ref={logRef} style={{ height: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
            {allLogLines.length > 0
              ? allLogLines.map((entry, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                    <span style={{ fontSize: 8, color: C.dim, flexShrink: 0, minWidth: 70 }}>{entry.src}</span>
                    <span className={`log-line ${i >= allLogLines.length - 5 ? 'fresh' : ''}`} style={{ flex: 1 }}>
                      {entry.line.slice(0, 120)}
                    </span>
                  </div>
                ))
              : <div style={{ color: C.muted, fontSize: 10, paddingTop: 8 }}>fetching logs...</div>
            }
          </div>
        </div>

        <div className="mc-card">
          <SectionTitle>Agent Log Sizes</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {(agentLogs?.agents || []).map((a) => (
              <div key={a.agent} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: a.exists && a.sizeKB > 0 ? C.green : C.dim, display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: C.text, minWidth: 120 }}>{AGENT_META[a.agent]?.label ?? a.agent}</span>
                <div style={{ flex: 1, height: 3, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, (a.sizeKB / 100) * 100)}%`, background: a.sizeKB > 50 ? C.yellow : C.accent, borderRadius: 2, transition: 'width 0.5s ease' }} />
                </div>
                <span style={{ fontSize: 9, color: C.muted, minWidth: 40, textAlign: 'right' }}>{a.sizeKB > 0 ? `${a.sizeKB}KB` : '—'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
