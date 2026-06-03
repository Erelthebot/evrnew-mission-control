'use client'

import Link from 'next/link'
import { systemAgents } from '@/lib/data'

const HOSTNAME = 'erel-masters-macbook-pro.local'

const LOG_COLORS: Record<string, string> = {
  competitive: '#0284c7',
  content: '#7c3aed',
  social: '#16a34a',
  ads: '#ca8a04',
  'blog-seo': '#ea580c',
  strategy: '#0891b2',
  'technical-seo': '#7c3aed',
  'email-drip': '#db2777',
}

function plistKey(plist?: string): string {
  if (!plist) return 'agent'
  return plist.replace('com.evrnew.agent-', '').replace('com.evrnew.', '')
}

function formatLastRun(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return `Today ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
  }
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

const agents = systemAgents.map((a, i) => ({
  id: i + 1,
  role: a.role,
  plist: a.plist ?? '',
  status: a.status,
  schedule: a.schedule,
  llm: a.llm,
  lastRun: formatLastRun(a.lastRun),
  lastRunRaw: a.lastRun,
  description: a.description ?? '',
  tools: a.tools,
  outputDir: (a.outputDir ?? '').replace(/^~\/evrnew-marketing\//, ''),
  logKey: plistKey(a.plist),
}))

const LOG_LINES = [
  { time: '06:00:02', agent: 'competitive', msg: 'Starting SERP crawl for 20 target cities...', success: false },
  { time: '06:00:18', agent: 'competitive', msg: 'Fetched 40 SERP pages — Attic Projects found in 12 results', success: false },
  { time: '06:00:31', agent: 'competitive', msg: 'Saved intel to data/competitors/2026-05-18.md', success: false },
  { time: '06:00:31', agent: 'competitive', msg: '✓ Run complete in 29s — Telegram notified', success: true },
  { time: '07:00:01', agent: 'content', msg: 'Generating landing pages for 5 target cities...', success: false },
  { time: '07:00:44', agent: 'content', msg: '✓ 5 landing pages written — saved to data/content/', success: true },
  { time: '08:00:00', agent: 'social', msg: 'Generating daily posts for Facebook, Instagram, GBP...', success: false },
  { time: '08:00:38', agent: 'social', msg: '✓ 9 posts generated (3 per platform) — saved to data/social/', success: true },
  { time: '09:00:01', agent: 'blog-seo', msg: 'Starting blog post generation — targeting King & Snohomish counties', success: false },
  { time: '09:01:14', agent: 'blog-seo', msg: '✓ 3 blog posts written — saved to data/blog-seo/', success: true },
  { time: '10:00:00', agent: 'technical-seo', msg: 'Running schema markup generation for evrnew.com...', success: false },
  { time: '10:01:05', agent: 'technical-seo', msg: '✓ LocalBusiness schema + 8 pages updated — saved to data/seo/', success: true },
  { time: '14:00:00', agent: 'ads', msg: 'Generating ad copy batch — 4 ad groups × 3 variants...', success: false },
  { time: '14:01:12', agent: 'ads', msg: '✓ 12 ad variants written — saved to data/ads/', success: true },
  { time: '08:00:00', agent: 'strategy', msg: 'Weekly brief synthesis started — consensus panel (Holo3 + grok-3 + Llama-70B-4bit)...', success: false },
  { time: '08:02:30', agent: 'strategy', msg: '✓ Strategy brief complete — saved to data/strategy/2026-W20.md', success: true },
  { time: '09:00:02', agent: 'email-drip', msg: 'Generating nurture sequences — 5 lead types...', success: false },
  { time: '09:01:48', agent: 'email-drip', msg: '✓ 25 emails written (5 sequences × 5 emails) — saved to data/email-drip/', success: true },
]

const totalAgents = agents.length
const activeCount = agents.filter(a => a.status === 'active').length
const today = new Date().toDateString()
const runsToday = agents.filter(a => {
  if (!a.lastRunRaw) return a.lastRun.startsWith('Today')
  const d = new Date(a.lastRunRaw)
  return !Number.isNaN(d.getTime()) && d.toDateString() === today
}).length

export default function OperationsPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-slate-600">
        Live cluster charts (memory, GPU, CPU, cron) are on{' '}
        <Link href="/#live-charts" className="text-sky-600 font-semibold hover:underline">
          Mission Control
        </Link>
        — not on this page.
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="mc-label text-sky-600 mb-1">Agent Fleet</h1>
          <p className="text-xs text-slate-500">
            {totalAgents} autonomous marketing agents running on {HOSTNAME}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full px-3 py-1.5 border border-green-200 bg-green-50">
          <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
          <span className="text-[11px] font-bold tracking-widest text-green-700">
            {activeCount}/{totalAgents} ONLINE
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Agents', value: String(totalAgents) },
          { label: 'Active Now', value: String(activeCount) },
          { label: 'Runs Today', value: String(runsToday) },
          { label: 'Outputs Generated', value: '47' },
        ].map(stat => (
          <div key={stat.label} className="mc-card">
            <p className="mc-label text-sky-600 mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {agents.map(agent => (
          <AgentCard key={agent.plist} agent={agent} />
        ))}
      </div>

      <div>
        <h2 className="mc-label text-sky-600 mb-3">Recent Agent Activity</h2>
        <div className="mc-card bg-slate-50 font-mono text-[11px] space-y-1 overflow-x-auto">
          {LOG_LINES.map((line, i) => {
            const color = LOG_COLORS[line.agent] ?? '#64748b'
            return (
              <div key={i}>
                <span className="text-slate-400">[{line.time}] </span>
                <span className="font-bold" style={{ color }}>[{line.agent}]</span>
                <span className={line.success ? 'text-green-700' : 'text-slate-600'}>
                  {' '}
                  {line.msg}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

type FleetAgent = (typeof agents)[number]

function AgentCard({ agent }: { agent: FleetAgent }) {
  const isActive = agent.status === 'active'
  const statusColor = isActive ? '#16a34a' : agent.status === 'error' ? '#dc2626' : '#ca8a04'
  const statusLabel = isActive ? 'ACTIVE' : agent.status === 'error' ? 'ERROR' : 'IDLE'

  return (
    <div className="mc-card p-0 overflow-hidden flex flex-col">
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold bg-violet-600 text-white">
            {agent.id}
          </span>
          <div className="min-w-0">
            <p className="font-bold text-sm leading-tight text-slate-900 truncate">{agent.role}</p>
            <p className="text-[9px] font-mono text-slate-400 truncate">{agent.plist}</p>
          </div>
        </div>
        <div
          className="flex items-center gap-1.5 shrink-0 rounded-full px-2 py-0.5 border"
          style={{ borderColor: `${statusColor}40`, background: `${statusColor}12` }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: statusColor }} />
          <span className="text-[9px] font-bold tracking-widest" style={{ color: statusColor }}>
            {statusLabel}
          </span>
        </div>
      </div>

      <p className="px-4 pb-3 text-[11px] leading-snug text-slate-600">{agent.description}</p>

      <div className="border-t border-slate-200" />

      <div className="px-4 py-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] text-slate-600">
        <div>
          <span className="mr-1">⏰</span>
          {agent.schedule}
        </div>
        <div className="truncate">
          <span className="mr-1">🧠</span>
          {agent.llm}
        </div>
        <div>
          <span className="mr-1 text-green-600">✓</span>
          {agent.lastRun}
        </div>
      </div>

      <div className="px-4 pb-3 flex flex-wrap gap-1 items-center">
        <span className="text-[10px] text-slate-400 mr-1">Tools:</span>
        {agent.tools.map(tool => (
          <span
            key={tool}
            className="text-[10px] px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600"
          >
            {tool}
          </span>
        ))}
      </div>

      <div className="px-4 pb-3 flex items-center gap-1.5">
        <span className="text-[10px] text-slate-400">Output:</span>
        <span className="font-mono text-[10px] text-slate-500">{agent.outputDir}</span>
      </div>

      <div className="mt-auto bg-slate-50 rounded-b-lg px-4 py-2.5 border-t border-slate-200 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[10px] text-slate-400">LaunchAgent </span>
          <span className="font-mono text-[10px] text-sky-600 truncate">{agent.plist}</span>
        </div>
        <button
          type="button"
          onClick={() => alert(`Agent queued: ${agent.role}`)}
          className="shrink-0 text-[10px] text-sky-600 border border-sky-200 px-3 py-1 rounded hover:bg-sky-50 transition-colors"
        >
          Run Now ▶
        </button>
      </div>
    </div>
  )
}
