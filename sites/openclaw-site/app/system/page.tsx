'use client'

import { useEffect, useState } from 'react'
import { systemServices, integrations, mcpServers, systemAgents } from '@/lib/data'
import type { ServiceHealth, SystemService } from '@/lib/data'
import IntegrationsTable from '@/app/components/IntegrationsTable'
import { LLM_STACK_UPDATED } from '@/lib/llm-stack'

const HEALTH_STYLES: Record<ServiceHealth, { dot: string; label: string; color: string }> = {
  online:   { dot: 'bg-emerald-500',              label: 'Online',   color: '#00ff88' },
  degraded: { dot: 'bg-amber-400 animate-pulse',  label: 'Degraded', color: '#ffe100' },
  offline:  { dot: 'bg-red-500',                  label: 'Offline',  color: '#ff2d55' },
  pending:  { dot: 'bg-slate-400',                label: 'Pending',  color: '#9d85c4' },
}

// ── LLM Stack: every service and what LLM it uses ────────────────────────────
// Canonical source: ~/evrnew-marketing/config/llm-config.json + Obsidian vault
// Agent-Shared/model-utilization.md. Last verified: 2026-05-18 (big-bang cutover).

type LLMDep = 'xai' | 'openrouter' | 'local-holo' | 'local-mlx' | 'claude-cli' | 'multi' | 'none' | 'gemini-image'

interface LLMService {
  service: string
  runtime: string
  llm: string
  provider: string
  dep: LLMDep
  fallback?: string
  note?: string
}

const LLM_STACK: LLMService[] = [
  {
    service: 'OpenClaw Gateway',
    runtime: 'ai.openclaw.gateway (system launchd, port 18789)',
    llm: 'grok-3',
    provider: 'xAI',
    dep: 'xai',
    fallback: 'none — director role',
    note: 'Communications only. Pinned model (no dynamic discovery). Calls claude_task MCP for execution.',
  },
  {
    service: 'Hermes Agent',
    runtime: 'ai.hermes.gateway (user launchd)',
    llm: 'grok-3',
    provider: 'xAI',
    dep: 'xai',
    fallback: 'mlx-community/Llama-3.3-70B-Instruct-4bit at :52415/v1',
    note: 'Executor/monitor. Keys from ~/.env via ~/.hermes/config.yaml (no inline secrets).',
  },
  {
    service: 'Mission Control Chat',
    runtime: 'app/api/chat/route.ts (erel.evrnew.com)',
    llm: 'grok-3',
    provider: 'xAI',
    dep: 'xai',
    fallback: 'mlx-community/Llama-3.3-70B-Instruct-4bit at :52415/v1',
    note: 'Site chat widget — same fallback chain as llm-router conversational path.',
  },
  {
    service: 'Execution Planner',
    runtime: 'erel-execute.py (called by mcp-claude-task.js)',
    llm: 'mlx-community/Llama-3.3-70B-Instruct-4bit',
    provider: 'Local cluster (:52415/v1)',
    dep: 'local-mlx',
    fallback: 'grok-3 (xAI) if cluster unreachable',
    note: 'Translates vague task into precise file paths + commands for Claude Code. Port 8080 is Holo3 vision only — not the planner.',
  },
  {
    service: 'Task Executor',
    runtime: 'claude-task.sh → claude --print --dangerously-skip-permissions',
    llm: 'claude-sonnet-4-6',
    provider: 'Anthropic (CLI only)',
    dep: 'claude-cli',
    note: 'The only Claude in the stack. Executes file edits, builds, service restarts.',
  },
  {
    service: 'Consensus Engine',
    runtime: 'consensus.py (all strategic / ad-spend decisions)',
    llm: 'Holo3-35B (vision) + grok-3 (analytical) + Llama-70B-4bit (synthesis)',
    provider: 'Multi-LLM — parallel panel, local cluster synthesizes',
    dep: 'multi',
    note: 'Required for marketing recommendations and ambiguous commands. No OpenRouter on hot path.',
  },
  {
    service: 'Local Cluster (reasoning + overflow)',
    runtime: 'mlx-cluster-proxy :52415 → mlx_lm.server :52416 (exo target)',
    llm: 'mlx-community/Llama-3.3-70B-Instruct-4bit',
    provider: 'Local MLX',
    dep: 'local-mlx',
    fallback: 'grok-3',
    note: 'Consensus synthesis, reasoning/overflow tasks, hub routing. DeepSeek-V4-Flash deferred (148 GB > 96 GB pooled).',
  },
  {
    service: 'Holo3 Vision / GUI',
    runtime: 'llama-server (port 8080)',
    llm: 'Holo3-35B-A3B-Q4_K_M',
    provider: 'Local llama.cpp',
    dep: 'local-holo',
    note: 'Screen/GUI agent work only — vision, UI grounding, computer-use trajectories.',
  },
  {
    service: 'Image Generation Agent',
    runtime: 'agents/image/agent.py',
    llm: 'gemini-3.1-flash-image-preview',
    provider: 'Google Gemini API',
    dep: 'gemini-image',
    note: 'Marketing images only. Not used for text or reasoning.',
  },
  {
    service: 'Embeddings',
    runtime: 'Ollama (port 11435)',
    llm: 'nomic-embed-text',
    provider: 'Local Ollama',
    dep: 'none',
    note: 'RAG / memory embeddings only. Port :11434 intentionally unused.',
  },
  {
    service: 'OpenClaw Cron Jobs',
    runtime: '~/.openclaw/cron/jobs.json',
    llm: 'grok-3',
    provider: 'xAI (via OpenClaw session)',
    dep: 'xai',
    note: 'Silent on pass (delivery=none).',
  },
  {
    service: 'Hermes Cron Jobs',
    runtime: 'Hermes scheduler (ghl-pipeline-scan, mission-control-health, etc.)',
    llm: 'grok-3',
    provider: 'xAI (Hermes gateway)',
    dep: 'xai',
    fallback: 'local cluster :52415',
    note: 'Inherits Hermes default model.',
  },
  {
    service: 'Gmail Inbox Monitor',
    runtime: 'com.openclaw.gmail-watcher (embedded in OpenClaw)',
    llm: 'grok-3',
    provider: 'xAI (via OpenClaw)',
    dep: 'xai',
    note: 'Routes email events through OpenClaw agent session.',
  },
  {
    service: 'OpenRouter API',
    runtime: 'OPENROUTER_API_KEY in .env — not in hot path',
    llm: '(reserved)',
    provider: 'OpenRouter',
    dep: 'openrouter',
    note: 'Key retained for legacy/future use. DeepSeek-V4-Flash deferred until cluster RAM ≥ 152 GB.',
  },
]

const DEP_STYLE: Record<LLMDep, { badge: string; dot: string }> = {
  'xai':          { badge: 'bg-sky-100 text-sky-700 border-sky-200',         dot: 'bg-sky-500' },
  'openrouter':   { badge: 'bg-violet-100 text-violet-700 border-violet-200', dot: 'bg-violet-500' },
  'local-holo':   { badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  'local-mlx':    { badge: 'bg-teal-100 text-teal-700 border-teal-200',      dot: 'bg-teal-500' },
  'claude-cli':   { badge: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  'multi':        { badge: 'bg-amber-100 text-amber-700 border-amber-200',   dot: 'bg-amber-500' },
  'none':         { badge: 'bg-slate-100 text-slate-500 border-slate-200',   dot: 'bg-slate-400' },
  'gemini-image': { badge: 'bg-pink-100 text-pink-700 border-pink-200',      dot: 'bg-pink-500' },
}

const CRON_JOBS = [
  { name: 'Health Check',       schedule: '*/15 * * * *', description: 'health-check.sh',                                lastRun: '2026-04-10T00:00:00Z', status: 'ok' },
  { name: 'Log Rotation',       schedule: '0 3 * * 0',    description: 'log-rotate.sh (Sunday 3 AM)',                    lastRun: '2026-04-06T03:00:00Z', status: 'ok' },
  { name: 'Disk Cleanup',       schedule: '0 4 * * 0',    description: 'disk-cleanup.sh (Sunday 4 AM)',                  lastRun: '2026-04-06T04:00:00Z', status: 'ok' },
  { name: 'Moltbook Heartbeat', schedule: '*/30 * * * *', description: 'com.evrnew.moltbook-heartbeat launchd',          lastRun: '2026-04-10T00:00:00Z', status: 'ok' },
  { name: 'Service Restart',    schedule: 'on-demand',    description: 'worker-control.sh / restart-services.sh',        lastRun: '2026-04-10T00:00:00Z', status: 'ok' },
]

const API_KEYS = [
  { name: 'xAI Grok API',        env: 'XAI_API_KEY',               configured: true  },
  { name: 'OpenRouter API',      env: 'OPENROUTER_API_KEY',        configured: true  },
  { name: 'Gemini API (image)',  env: 'GEMINI_API_KEY',            configured: true  },
  { name: 'GoHighLevel API',     env: 'GHL_API_KEY',               configured: true  },
  { name: 'SpyFu API',           env: 'SPYFU_API_KEY',             configured: true  },
  { name: 'SendGrid API',        env: 'SENDGRID_API_KEY',          configured: true  },
  { name: 'BrowserBase API',     env: 'BROWSERBASE_API_KEY',       configured: true  },
  { name: 'Google Ads API',      env: 'GOOGLE_ADS_DEVELOPER_TOKEN', configured: true },
  { name: 'Google Maps API',     env: 'GOOGLE_MAPS_API_KEY',       configured: true  },
  { name: 'Google Analytics',    env: 'GA_MEASUREMENT_ID',         configured: true  },
  { name: 'Moltbook API',        env: 'MOLTBOOK_API_KEY',          configured: true  },
  { name: 'Telegram Bot Token',  env: 'TELEGRAM_BOT_TOKEN',        configured: true  },
  { name: 'OpenClaw Token',      env: 'OPENCLAW_GATEWAY_TOKEN',    configured: true  },
  { name: 'Twilio SID',          env: 'TWILIO_ACCOUNT_SID',        configured: true  },
  { name: 'Brave Search API',    env: 'BRAVE_API_KEY',             configured: true  },
  { name: 'GitHub Token',        env: 'GITHUB_TOKEN',              configured: true  },
  { name: 'Facebook Ads',        env: 'FACEBOOK_ACCESS_TOKEN',     configured: true  },
  { name: 'DataForSEO',          env: 'DATAFORSEO_LOGIN',          configured: true  },
  { name: 'QuickBooks',          env: 'QB_CLIENT_ID',              configured: true  },
]

interface SysMetrics {
  uptimeStr: string
  memory: { totalGB: number; usedGB: number; pct: number; clusterNodes: number }
  gpu: { model: string; cores: number; memUsedGB: number; memAllocGB: number }
}

interface InferenceData {
  ts: number
  server: { ok: boolean; status: string; loadingModel: boolean; url: string }
  model: { name: string; quant: string; file: string; sizeGB: number; ctxTokens: number; kvCache: string; kvCompression: string; flashAttn: boolean; threads: number; parallel: number }
  throughput: { promptTps: number; generateTps: number; totalPromptTokens: number; totalGenTokens: number; requestsProcessing: number; requestsDeferred: number }
  kvCache: { usageRatio: number; tokens: number; type: string; compression: string; ctxMax: number }
  rpc: { ok: boolean; worker: string; port: number; latencyMs: number | null }
  nodes: { role: string; host: string; type: string; allocGB: number; backend: string; ok?: boolean; port?: number; layers?: string }[]
  cluster?: { engine: string; version: string; port: number; threads: number; gpuLayers: number; totalGB: number; worldSize?: number }
}

const IC = {
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

export default function SystemPage() {
  const [services, setServices]     = useState<SystemService[]>(systemServices)
  const [sysMetrics, setSysMetrics] = useState<SysMetrics | null>(null)
  const [inference, setInference]   = useState<InferenceData | null>(null)

  useEffect(() => {
    const now = new Date().toISOString()
    setServices(systemServices.map(s => ({ ...s, lastChecked: now })))
    fetch('/api/system-metrics').then(r => r.json()).then(setSysMetrics).catch(() => {})
    const poll = () => fetch('/api/inference-health', { cache: 'no-store' }).then(r => r.json()).then(setInference).catch(() => {})
    poll()
    const t = setInterval(poll, 10000)
    return () => clearInterval(t)
  }, [])

  const onlineCount        = services.filter(s => s.status === 'online').length
  const activeIntegrations = integrations.filter(i => i.status === 'active').length
  const configuredKeys     = API_KEYS.filter(k => k.configured).length
  const totalGB  = sysMetrics?.memory?.totalGB ?? 48
  const usedGB   = sysMetrics?.memory?.usedGB ?? 0
  const pct      = sysMetrics?.memory?.pct ?? 0

  return (
    <div className="px-5 py-6 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-[10px] tracking-[3px] uppercase text-sky-600 mb-1">System Status</h1>
        <p className="text-slate-500 text-xs">
          {onlineCount}/{systemServices.length} services online &middot; {activeIntegrations} integrations active &middot; {configuredKeys}/{API_KEYS.length} API keys configured
        </p>
      </div>

      {/* Server Identity */}
      <section>
        <SectionTitle>Server Identity</SectionTitle>
        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col sm:flex-row gap-6">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sky-50 border border-sky-400 flex items-center justify-center text-sky-600 font-bold text-sm shadow-sm">
                ER
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Erel</p>
                <p className="text-[11px] text-slate-400">Autonomous AI marketing server &middot; Evrnew LLC</p>
              </div>
              <span className="ml-auto flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse inline-block" />
                <span className="text-[11px] text-emerald-600">Online</span>
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <Stat label="Hostname"   value="erel-masters-macbook-pro.local" />
              <Stat label="Hardware"   value="MacBook Pro M5 Pro" />
              <Stat label="CPU"        value="18-core M5 Pro" />
              <Stat label="RAM"        value={`${usedGB > 0 ? usedGB : '?'} / ${totalGB} GB (${pct}%)`} />
              <Stat label="Storage"    value="1 TB SSD" />
              <Stat label="OS"         value="macOS 26" />
              <Stat label="GPU"        value={`${sysMetrics?.gpu?.model ?? 'Apple M5 Pro'} · ${sysMetrics?.gpu?.cores ?? 20} cores`} />
              <Stat label="Uptime"     value={sysMetrics?.uptimeStr ?? '—'} />
            </div>
          </div>
          <div className="sm:w-64 space-y-2 text-xs">
            <p className="text-[10px] tracking-widest uppercase text-slate-400 mb-2">Active Services</p>
            <div className="space-y-1.5">
              {[
                'OpenClaw Gateway — port 18789 (grok-3)',
                'Hermes Agent — user launchd (grok-3)',
                'mlx-cluster-proxy — :52415 (Llama-70B-4bit reasoning/overflow)',
                'mlx_lm.server — :52416 (cluster backend, master)',
                'llama-server — Holo3-35B vision :8080',
                'Ollama embeddings — nomic-embed-text :11435',
                'Mission Control — Next.js :3003',
                'Telegram Filter Proxy — :18799',
                'nginx Docker — 443/80 → 3003',
              ].map(s => (
                <div key={s} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block shrink-0" />
                  <span className="text-slate-400 text-[10px]">{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* LLM Stack — Service Registry */}
      <section>
        <SectionTitle>LLM Stack — Service Registry</SectionTitle>
        <p className="text-[11px] text-slate-400 mb-3 -mt-1">
          Canonical 2026-05 stack — verified {LLM_STACK_UPDATED}. Config:{' '}
          <span className="font-mono">~/evrnew-marketing/config/llm-config.json</span>
        </p>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { dep: 'xai' as LLMDep,          label: 'xAI (Grok-3)' },
            { dep: 'local-mlx' as LLMDep,    label: 'Local cluster (:52415)' },
            { dep: 'local-holo' as LLMDep,   label: 'Holo3 vision (:8080)' },
            { dep: 'gemini-image' as LLMDep, label: 'Gemini (image only)' },
            { dep: 'claude-cli' as LLMDep,   label: 'Claude CLI' },
            { dep: 'multi' as LLMDep,        label: 'Consensus panel' },
            { dep: 'none' as LLMDep,         label: 'Embeddings' },
            { dep: 'openrouter' as LLMDep,   label: 'OpenRouter (reserved)' },
          ].map(({ dep, label }) => (
            <span key={dep} className={`text-[10px] px-2 py-0.5 rounded border font-mono ${DEP_STYLE[dep].badge}`}>
              {label}
            </span>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[180px_1fr_140px] text-[10px] uppercase tracking-widest text-slate-400 px-4 py-2 border-b border-slate-100 bg-slate-50">
            <span>Service</span>
            <span>LLM / Model</span>
            <span>Provider</span>
          </div>
          {LLM_STACK.map((row, i) => (
            <div
              key={row.service}
              className={`px-4 py-3 ${i < LLM_STACK.length - 1 ? 'border-b border-slate-100' : ''}`}
            >
              <div className="grid grid-cols-[180px_1fr_140px] items-start gap-2">
                {/* Service name */}
                <div>
                  <p className="text-[11px] font-semibold text-slate-900 leading-tight">{row.service}</p>
                  <p className="text-[9px] text-slate-400 mt-0.5 leading-tight font-mono">{row.runtime}</p>
                </div>
                {/* LLM */}
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full inline-block shrink-0 ${DEP_STYLE[row.dep].dot}`} />
                    <p className="text-[11px] font-mono text-slate-800">{row.llm}</p>
                  </div>
                  {row.fallback && (
                    <p className="text-[10px] text-slate-400 italic ml-3.5">↳ fallback: {row.fallback}</p>
                  )}
                  {row.note && (
                    <p className="text-[10px] text-slate-400 ml-3.5 mt-0.5">{row.note}</p>
                  )}
                </div>
                {/* Provider badge */}
                <div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${DEP_STYLE[row.dep].badge}`}>
                    {row.provider}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Dependency summary */}
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { dep: 'xai' as LLMDep,        label: 'xAI (Grok-3)', count: LLM_STACK.filter(r => r.dep === 'xai').length },
            { dep: 'local-mlx' as LLMDep,  label: 'Local cluster', count: LLM_STACK.filter(r => r.dep === 'local-mlx').length },
            { dep: 'multi' as LLMDep,      label: 'Consensus',     count: LLM_STACK.filter(r => r.dep === 'multi').length },
            { dep: 'claude-cli' as LLMDep, label: 'Claude CLI',    count: LLM_STACK.filter(r => r.dep === 'claude-cli').length },
          ].map(({ dep, label, count }) => (
            <div key={dep} className={`border rounded-lg px-3 py-2 ${DEP_STYLE[dep].badge}`}>
              <p className="text-[10px] font-semibold">{label}</p>
              <p className="text-lg font-bold leading-tight">{count}</p>
              <p className="text-[9px] opacity-70">{count === 1 ? 'service' : 'services'} dependent</p>
            </div>
          ))}
        </div>
      </section>

      {/* Local Inference */}
      <section>
        <SectionTitle>
          {inference?.cluster?.engine === 'exo'
            ? `Inference Engine — exo · MLX · ${inference?.model?.name ?? '···'}`
            : `Inference Engine — llama.cpp · ${inference?.model?.name ?? '···'}`}
        </SectionTitle>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>

            {/* Model */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: IC.muted, fontWeight: 700, marginBottom: 2 }}>Model</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: inference?.server?.ok ? IC.green : inference?.server?.loadingModel ? IC.yellow : IC.red, display: 'inline-block', animation: inference?.server?.ok ? 'pulse 2s infinite' : 'none' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: IC.text, letterSpacing: '-0.02em' }}>
                  {inference?.model?.name ?? 'Llama-3.3-70B-Instruct-4bit'}
                </span>
                <span style={{ fontSize: 9, color: IC.muted }}>{inference?.model?.quant ?? 'Q4_K_M'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {[
                  ['Status',   inference?.server?.status ?? '···'],
                  ['KV Cache', `${inference?.model?.kvCache ?? 'f16'} · ${inference?.model?.kvCompression ?? 'n/a'}`],
                  ['Context',  `${inference?.model?.ctxTokens ? (inference.model.ctxTokens / 1024).toFixed(0) + 'K' : '32K'} tokens`],
                  ['Size',     `${inference?.model?.sizeGB ?? 17} GB · Flash Attn ${inference?.model?.flashAttn ? 'on' : 'off'}`],
                  ['Engine',   inference?.cluster?.engine ?? 'llama-server'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                    <span style={{ color: IC.muted }}>{k}</span>
                    <span style={{ color: IC.text, fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Throughput + KV cache */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: IC.muted, fontWeight: 700, marginBottom: 2 }}>Throughput</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 4 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: IC.accent, letterSpacing: '-0.03em' }}>
                    {inference?.throughput?.promptTps ?? '—'}
                  </div>
                  <div style={{ fontSize: 9, color: IC.muted }}>t/s prompt</div>
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: IC.purple, letterSpacing: '-0.03em' }}>
                    {inference?.throughput?.generateTps ?? '—'}
                  </div>
                  <div style={{ fontSize: 9, color: IC.muted }}>t/s generate</div>
                </div>
              </div>
              <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: IC.muted, fontWeight: 700, marginBottom: 2 }}>KV Cache</div>
              <div style={{ width: '100%', height: 4, background: IC.border, borderRadius: 2, overflow: 'hidden', marginBottom: 2 }}>
                <div style={{ height: '100%', width: `${inference?.kvCache?.usageRatio ?? 0}%`, background: (inference?.kvCache?.usageRatio ?? 0) > 80 ? IC.yellow : IC.green, borderRadius: 2, transition: 'width 0.5s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                <span style={{ color: IC.muted }}>Usage</span>
                <span style={{ color: IC.text }}>{inference?.kvCache?.usageRatio ?? 0}% · {(inference?.kvCache?.tokens ?? 0).toLocaleString()} tokens</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                <span style={{ color: IC.muted }}>Active reqs</span>
                <span style={{ color: IC.text }}>{inference?.throughput?.requestsProcessing ?? 0} processing · {inference?.throughput?.requestsDeferred ?? 0} queued</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                <span style={{ color: IC.muted }}>Lifetime tokens</span>
                <span style={{ color: IC.text }}>{((inference?.throughput?.totalGenTokens ?? 0) + (inference?.throughput?.totalPromptTokens ?? 0)).toLocaleString()}</span>
              </div>
            </div>

            {/* Server node */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: IC.muted, fontWeight: 700, marginBottom: 2 }}>
                {inference?.cluster?.engine === 'exo' ? `Cluster Nodes (${inference?.cluster?.worldSize ?? 2})` : 'Server Node'}
              </div>
              {(inference?.nodes ?? [
                { role: 'master', host: '127.0.0.1', type: 'Apple Metal (GPU)', allocGB: 17, backend: 'llama-server', ok: null as boolean | null, port: 8080, layers: 'all' },
              ]).map((node, i) => {
                const isWorker = node.role === 'worker'
                const nodeOk = (node.ok as boolean | null | undefined) ?? (inference?.server?.ok ?? null)
                return (
                  <div key={`${node.role}-${i}`} style={{ border: `1px solid ${IC.border}`, borderRadius: 6, padding: '8px 10px', background: '#fafcff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: nodeOk === true ? IC.green : nodeOk === false ? IC.red : IC.dim, display: 'inline-block' }} />
                        <span style={{ fontSize: 10, fontWeight: 600, color: IC.text }}>erel_{node.role}</span>
                      </div>
                      <span style={{ fontSize: 8, color: IC.muted, fontFamily: 'monospace' }}>{node.backend}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                      <div>
                        <div style={{ fontSize: 8, color: IC.muted }}>Endpoint</div>
                        <div style={{ fontSize: 9, color: IC.text, fontFamily: 'monospace' }}>{node.host}:{node.port ?? 8080}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 8, color: IC.muted }}>Type</div>
                        <div style={{ fontSize: 9, color: IC.text }}>{node.type}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 8, color: IC.muted }}>Model alloc</div>
                        <div style={{ fontSize: 9, color: IC.accent, fontWeight: 600 }}>{node.allocGB} GB</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 8, color: IC.muted }}>{isWorker ? 'Link' : 'Layers'}</div>
                        {isWorker
                          ? <div style={{ fontSize: 9, color: IC.green }}>TB5 · 192.168.100.x</div>
                          : <div style={{ fontSize: 9, color: IC.text }}>{node.layers ?? 'all'}</div>
                        }
                      </div>
                    </div>
                  </div>
                )
              })}
              <div style={{ fontSize: 9, color: IC.muted, marginTop: 2 }}>
                {inference?.cluster?.engine === 'exo'
                  ? `${inference?.model?.sizeGB ?? 40.6} GB · exo MlxRing · port ${inference?.cluster?.port ?? 52415} · ${inference?.cluster?.worldSize ?? 2} nodes · TB5`
                  : `${inference?.model?.sizeGB ?? 17} GB · llama-server · port ${inference?.cluster?.port ?? 8080} · ${inference?.model?.threads ?? 8} threads`
                }
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Services Health */}
      <section>
        <SectionTitle>Services Health</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {services.map(service => {
            const style = HEALTH_STYLES[service.status]
            return (
              <div key={service.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-900">{service.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full inline-block ${style.dot}`} />
                    <span className="text-[10px]" style={{ color: style.color }}>{style.label}</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug mb-2">{service.description}</p>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  {service.uptime && <span>Uptime: <span className="text-slate-500">{service.uptime}</span></span>}
                  <span>Checked: {new Date(service.lastChecked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {service.endpoint && (
                  <p className="text-[10px] text-slate-400 mt-1">{service.endpoint}</p>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* MCP Servers */}
      <section>
        <SectionTitle>MCP Servers ({mcpServers.length} active)</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {mcpServers.map(mcp => (
            <div key={mcp.name} className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex items-start gap-3">
              <div className="w-6 h-6 rounded bg-violet-50 border border-violet-400 flex items-center justify-center shrink-0 mt-0.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" />
              </div>
              <div>
                <p className="text-xs font-semibold text-violet-600">{mcp.name}</p>
                <p className="text-[11px] text-slate-500 leading-snug">{mcp.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Integrations */}
      <section>
        <SectionTitle>Integrations & API Status</SectionTitle>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <IntegrationsTable />
        </div>
      </section>

      {/* Cron Schedule */}
      <section>
        <SectionTitle>Cron Schedule</SectionTitle>
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-4 text-[10px] uppercase tracking-widest text-slate-400 px-4 py-2 border-b border-slate-100">
            <span>Job</span><span>Schedule</span><span>Last Run</span><span>Status</span>
          </div>
          {CRON_JOBS.map((job, i) => (
            <div key={job.name} className={`grid grid-cols-4 items-center px-4 py-2.5 text-xs ${i < CRON_JOBS.length - 1 ? 'border-b border-slate-100' : ''}`}>
              <div>
                <p className="text-slate-900 font-medium">{job.name}</p>
                <p className="text-[10px] text-slate-500">{job.description}</p>
              </div>
              <span className="text-violet-600 font-mono text-[11px]">{job.schedule}</span>
              <span className="text-slate-400">{new Date(job.lastRun).toLocaleDateString()}</span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" />
                <span className="text-emerald-600">ok</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Agent Fleet */}
      <section>
        <SectionTitle>Agent Fleet ({systemAgents.length} agents active)</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
          {systemAgents.map(agent => (
            <div key={agent.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-900 leading-tight">{agent.role}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-mono">{agent.plist}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-pulse" />
                  <span className="text-[10px] text-emerald-600">active</span>
                </div>
              </div>
              {agent.description && (
                <p className="text-[11px] text-slate-500 leading-snug mb-3">{agent.description}</p>
              )}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                <div>
                  <span className="text-slate-400 uppercase tracking-wide">Schedule</span>
                  <p className="text-slate-500 mt-0.5">{agent.schedule}</p>
                </div>
                <div>
                  <span className="text-slate-400 uppercase tracking-wide">LLM</span>
                  <p className="text-violet-600 mt-0.5 font-mono truncate">{agent.llm}</p>
                </div>
                <div>
                  <span className="text-slate-400 uppercase tracking-wide">Last Run</span>
                  <p className="text-slate-500 mt-0.5">{agent.lastRun ? new Date(agent.lastRun).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</p>
                </div>
                <div>
                  <span className="text-slate-400 uppercase tracking-wide">Output</span>
                  <p className="text-slate-500 mt-0.5 truncate font-mono text-[9px]">{agent.outputDir}</p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {agent.tools.map(t => (
                  <span key={t} className="text-[9px] bg-slate-100 border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded">{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* API Keys */}
      <section>
        <SectionTitle>API Keys ({configuredKeys}/{API_KEYS.length} configured)</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {API_KEYS.map(key => (
            <div key={key.name} className={`bg-white border rounded-lg px-3 py-2.5 flex items-start gap-2.5 ${key.configured ? 'border-slate-200' : 'border-red-300'}`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 inline-block ${key.configured ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
              <div>
                <p className="text-[11px] font-medium text-slate-900">{key.name}</p>
                <p className="text-[10px] text-slate-500 font-mono">{key.env}</p>
                <p className={`text-[10px] mt-0.5 ${key.configured ? 'text-emerald-600' : 'text-red-600'}`}>
                  {key.configured ? 'configured' : 'missing'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] tracking-[3px] uppercase text-sky-600 mb-3 pb-2 border-b border-slate-200">
      {children}
    </h2>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded px-3 py-2">
      <p className="text-[9px] text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-slate-600">{value}</p>
    </div>
  )
}
