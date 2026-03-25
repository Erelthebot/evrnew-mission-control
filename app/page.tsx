'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'

// ── Types ─────────────────────────────────────────────────────────────────────
interface MemPoint { time: string; pct: number }
interface SysMetrics {
  ts: number; uptimeStr: string
  memory: { totalGB: number; usedGB: number; pct: number }
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MissionControl() {
  const [sysMetrics, setSysMetrics]   = useState<SysMetrics | null>(null)
  const [memHistory, setMemHistory]   = useState<MemPoint[]>([])
  const [gpuHistory, setGpuHistory]   = useState<GpuPoint[]>([])
  const [gateway, setGateway]         = useState<GatewayData | null>(null)
  const [agentLogs, setAgentLogs]     = useState<{ agents: AgentLog[]; gatewayLines: string[] } | null>(null)
  const [integrations, setIntegrations] = useState<Service[]>([])
  const [telegramSvc, setTelegramSvc] = useState<Service | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  const pollMetrics = useCallback(async () => {
    try {
      const r = await fetch('/api/system-metrics', { cache: 'no-store' })
      const d: SysMetrics = await r.json()
      setSysMetrics(d)
      const t = new Date(d.ts).toLocaleTimeString('en-US', { hour12: false }).slice(0, 8)
      setMemHistory(prev => [...prev, { time: t, pct: d.memory.pct }].slice(-72))
      if (d.gpu) {
        setGpuHistory(prev => [...prev, {
          time: t,
          device:    d.gpu.device,
          renderer:  d.gpu.renderer,
          tiler:     d.gpu.tiler,
          memUsedGB: d.gpu.memUsedGB,
        }].slice(-72))
      }
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

  useEffect(() => { pollMetrics();     const t = setInterval(pollMetrics, 5000);     return () => clearInterval(t) }, [pollMetrics])
  useEffect(() => { pollGateway();     const t = setInterval(pollGateway, 8000);     return () => clearInterval(t) }, [pollGateway])
  useEffect(() => { pollLogs();        const t = setInterval(pollLogs, 12000);       return () => clearInterval(t) }, [pollLogs])
  useEffect(() => { pollIntegrations();const t = setInterval(pollIntegrations, 20000);return () => clearInterval(t) }, [pollIntegrations])

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
    return { name, meta, log, cron }
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
          sub={sysMetrics ? `5m ${sysMetrics.load['5m']} · uptime ${sysMetrics.uptimeStr}` : 'loading...'}
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

      {/* ── Charts Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
        <div className="mc-card">
          <SectionTitle>Memory % — Live (5-sec intervals)</SectionTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: mem ? (mem.pct > 85 ? C.red : mem.pct > 70 ? C.yellow : C.green) : C.dim, letterSpacing: '-0.03em' }}>
              {mem ? `${mem.pct}%` : '—'}
            </span>
            <span style={{ fontSize: 10, color: C.muted }}>{mem ? `${mem.usedGB} GB used of ${mem.totalGB} GB` : ''}</span>
          </div>
          {memHistory.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={memHistory} margin={{ top: 2, right: 2, bottom: 0, left: -28 }}>
                <defs>
                  <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.accent} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={C.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: C.muted, fontSize: 8 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fill: C.muted, fontSize: 8 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="pct" name="mem" stroke={C.accent} strokeWidth={1.5} fill="url(#memGrad)" dot={false} isAnimationActive={false} />
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

      {/* ── GPU + Neural Engine Charts ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
        <div className="mc-card">
          <SectionTitle>GPU Utilization % — Live (5-sec intervals)</SectionTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: C.purple, letterSpacing: '-0.03em' }}>
              {sysMetrics?.gpu ? `${sysMetrics.gpu.device}%` : '—'}
            </span>
            <span style={{ fontSize: 10, color: C.muted }}>
              {sysMetrics?.gpu ? `${sysMetrics.gpu.model} · ${sysMetrics.gpu.cores} cores` : ''}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 14, marginBottom: 6 }}>
            {[
              { label: 'Device',   color: C.purple },
              { label: 'Renderer', color: C.accent },
              { label: 'Tiler',    color: '#7c3aed88' },
            ].map(({ label, color }) => (
              <span key={label} style={{ fontSize: 9, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 2, background: color, display: 'inline-block', borderRadius: 1 }} />
                {label}
              </span>
            ))}
          </div>
          {gpuHistory.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={gpuHistory} margin={{ top: 2, right: 2, bottom: 0, left: -28 }}>
                <defs>
                  <linearGradient id="gpuDevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.purple} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={C.purple} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gpuRenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.accent} stopOpacity={0.12} />
                    <stop offset="95%" stopColor={C.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time" tick={{ fill: C.muted, fontSize: 8 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fill: C.muted, fontSize: 8 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="device"   name="Device"   stroke={C.purple} strokeWidth={1.5} fill="url(#gpuDevGrad)" dot={false} isAnimationActive={false} />
                <Area type="monotone" dataKey="renderer" name="Renderer" stroke={C.accent}  strokeWidth={1}   fill="url(#gpuRenGrad)" dot={false} isAnimationActive={false} />
                <Area type="monotone" dataKey="tiler"    name="Tiler"    stroke="#9f7aea"  strokeWidth={1}   fill="none"             dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 10 }}>collecting data...</div>
          )}
        </div>

        <div className="mc-card">
          <SectionTitle>Neural Engine & GPU Memory — Live</SectionTitle>
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
            <span style={{ fontSize: 9, color: C.muted }}>Apple M4 Pro · Metal4</span>
          </div>
          {gpuHistory.length > 1 ? (
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
      </div>

      {/* ── Agents & Bots ── */}
      <div className="mc-card">
        <SectionTitle>Agents & Bots ({agentNames.length} Python agents · Gateway · Telegram Bot)</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10, marginTop: 8 }}>
          {agentCards.map(({ name, meta, log, cron }) => {
            const hasErr   = (cron?.consecutiveErrors ?? 0) > 0
            const dotColor = !log?.exists ? C.dim : hasErr ? C.red : cron?.lastStatus === 'ok' ? C.green : log.sizeKB > 0 ? C.accent : C.dim
            return (
              <div key={name} style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 12px', background: '#fafcff', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{meta.label}</span>
                </div>
                <div style={{ fontSize: 9, color: C.muted }}>{meta.desc}</div>
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
