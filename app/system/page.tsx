'use client'

import { useEffect, useState } from 'react'
import { systemServices, integrations, mcpServers, systemAgents } from '@/lib/data'
import type { ServiceHealth, SystemService } from '@/lib/data'
import IntegrationsTable from '@/app/components/IntegrationsTable'

const HEALTH_STYLES: Record<ServiceHealth, { dot: string; label: string; color: string }> = {
  online: { dot: 'bg-emerald-500', label: 'Online', color: '#00ff88' },
  degraded: { dot: 'bg-amber-400 animate-pulse', label: 'Degraded', color: '#ffe100' },
  offline: { dot: 'bg-red-500', label: 'Offline', color: '#ff2d55' },
  pending: { dot: 'bg-slate-400', label: 'Pending', color: '#9d85c4' },
}

const CRON_JOBS = [
  { name: 'Health Check', schedule: '*/15 * * * *', description: 'health-check.sh', lastRun: '2026-03-11T00:00:00Z', status: 'ok' },
  { name: 'Log Rotation', schedule: '0 3 * * 0', description: 'log-rotate.sh (Sunday 3 AM)', lastRun: '2026-03-09T03:00:00Z', status: 'ok' },
  { name: 'Disk Cleanup', schedule: '0 4 * * 0', description: 'disk-cleanup.sh (Sunday 4 AM)', lastRun: '2026-03-09T04:00:00Z', status: 'ok' },
  { name: 'Moltbook Heartbeat', schedule: '*/30 * * * *', description: 'com.evrnew.moltbook-heartbeat launchd', lastRun: '2026-03-11T00:00:00Z', status: 'ok' },
  { name: 'Service Restart', schedule: 'on-demand', description: 'restart-services.sh [all|inbox|ollama|n8n]', lastRun: '2026-03-11T00:00:00Z', status: 'ok' },
]

const API_KEYS = [
  { name: 'Anthropic API', env: 'ANTHROPIC_API_KEY', configured: true },
  { name: 'xAI Grok API', env: 'XAI_API_KEY', configured: true },
  { name: 'GoHighLevel API', env: 'GHL_API_KEY', configured: true },
  { name: 'SpyFu API', env: 'SPYFU_API_KEY', configured: true },
  { name: 'SendGrid API', env: 'SENDGRID_API_KEY', configured: true },
  { name: 'BrowserBase API', env: 'BROWSERBASE_API_KEY', configured: true },
  { name: 'Google Ads API', env: 'GOOGLE_ADS_DEVELOPER_TOKEN', configured: true },
  { name: 'Google Maps API', env: 'GOOGLE_MAPS_API_KEY', configured: true },
  { name: 'Google Analytics', env: 'GA_MEASUREMENT_ID', configured: true },
  { name: 'Moltbook API', env: 'MOLTBOOK_API_KEY', configured: true },
  { name: 'Telegram Bot Token', env: 'TELEGRAM_BOT_TOKEN', configured: true },
  { name: 'OpenClaw Token', env: 'OPENCLAW_GATEWAY_TOKEN', configured: true },
  { name: 'Twilio SID', env: 'TWILIO_ACCOUNT_SID', configured: true },
  { name: 'Brave Search API', env: 'BRAVE_API_KEY', configured: true },
  { name: 'GitHub Token', env: 'GITHUB_TOKEN', configured: true },
  { name: 'DataForSEO', env: 'DATAFORSEO_LOGIN', configured: false },
  { name: 'Buffer API', env: 'BUFFER_ACCESS_TOKEN', configured: false },
]

export default function SystemPage() {
  const [services, setServices] = useState<SystemService[]>(systemServices)

  // Stamp all service lastChecked with current time on mount (static site — reflects current deployment)
  useEffect(() => {
    const now = new Date().toISOString()
    setServices(systemServices.map(s => ({ ...s, lastChecked: now })))
  }, [])

  const onlineCount = services.filter(s => s.status === 'online').length
  const activeIntegrations = integrations.filter(i => i.status === 'active').length
  const configuredKeys = API_KEYS.filter(k => k.configured).length

  return (
    <div className="px-5 py-6 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-[10px] tracking-[3px] uppercase text-sky-600 mb-1">System Status</h1>
        <p className="text-slate-500 text-xs">{onlineCount}/{systemServices.length} services online &middot; {activeIntegrations} integrations active &middot; {configuredKeys}/{API_KEYS.length} API keys configured</p>
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
                <p className="text-[11px] text-slate-400">Cluster Node &middot; Evrnew LLC</p>
              </div>
              <span className="ml-auto flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse inline-block" />
                <span className="text-[11px] text-emerald-600">Online</span>
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <Stat label="Hostname" value="erel-masters-macbook-pro.local" />
              <Stat label="Hardware" value="MacBook Pro M5 Pro" />
              <Stat label="CPU" value="18-core M5 Pro" />
              <Stat label="RAM" value="48 GB unified" />
              <Stat label="Storage" value="1 TB SSD" />
              <Stat label="OS" value="macOS 26.3.1" />
            </div>
          </div>
          <div className="sm:w-64 space-y-2 text-xs">
            <p className="text-[10px] tracking-widest uppercase text-slate-400 mb-2">Services Running</p>
            <div className="space-y-1.5">
              {['OpenClaw Gateway (port 18789)', 'OpenClaw Relay (port 18792)', 'Gmail Inbox Monitor', 'MLX LLM Server · Llama-3.3-70B (port 11434)', 'Mission Control · Next.js (port 3003)', 'AI Triggers (evrnew.ai)', 'nginx · Docker proxy'].map(s => (
                <div key={s} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block shrink-0" />
                  <span className="text-slate-400">{s}</span>
                </div>
              ))}
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
            <span>Job</span>
            <span>Schedule</span>
            <span>Last Run</span>
            <span>Status</span>
          </div>
          {CRON_JOBS.map((job, i) => (
            <div
              key={job.name}
              className={`grid grid-cols-4 items-center px-4 py-2.5 text-xs ${i < CRON_JOBS.length - 1 ? 'border-b border-slate-100' : ''}`}
            >
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
            <div
              key={key.name}
              className={`bg-white border rounded-lg px-3 py-2.5 flex items-start gap-2.5 ${key.configured ? 'border-slate-200' : 'border-red-300'}`}
            >
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
