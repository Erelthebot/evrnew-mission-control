'use client'

import { systemServices, integrations, mcpServers } from '@/lib/data'
import type { ServiceHealth } from '@/lib/data'

const HEALTH_STYLES: Record<ServiceHealth, { dot: string; label: string; color: string }> = {
  online: { dot: 'bg-[#22c55e]', label: 'Online', color: '#22c55e' },
  degraded: { dot: 'bg-[#facc15] animate-pulse', label: 'Degraded', color: '#facc15' },
  offline: { dot: 'bg-[#ef4444]', label: 'Offline', color: '#ef4444' },
  pending: { dot: 'bg-[#444]', label: 'Pending', color: '#666' },
}

const CRON_JOBS = [
  { name: 'Health Check', schedule: '*/15 * * * *', description: 'health-check.sh', lastRun: '2026-03-05T11:45:00Z', status: 'ok' },
  { name: 'Log Rotation', schedule: '0 3 * * 0', description: 'log-rotate.sh (Sunday 3 AM)', lastRun: '2026-03-02T03:00:00Z', status: 'ok' },
  { name: 'Disk Cleanup', schedule: '0 4 * * 0', description: 'disk-cleanup.sh (Sunday 4 AM)', lastRun: '2026-03-02T04:00:00Z', status: 'ok' },
  { name: 'Service Restart', schedule: 'on-demand', description: 'restart-services.sh [all|inbox|ollama|n8n]', lastRun: '2026-03-01T09:00:00Z', status: 'ok' },
]

const API_KEYS = [
  { name: 'Anthropic API', env: 'ANTHROPIC_API_KEY', configured: true },
  { name: 'xAI Grok API', env: 'XAI_API_KEY', configured: true },
  { name: 'GoHighLevel API', env: 'GHL_API_KEY', configured: true },
  { name: 'DataForSEO', env: 'DATAFORSEO_LOGIN', configured: true },
  { name: 'SpyFu API', env: 'SPYFU_API_KEY', configured: true },
  { name: 'SendGrid API', env: 'SENDGRID_API_KEY', configured: true },
  { name: 'Buffer API', env: 'BUFFER_ACCESS_TOKEN', configured: true },
  { name: 'BrowserBase API', env: 'BROWSERBASE_API_KEY', configured: true },
  { name: 'Google Ads API', env: 'GOOGLE_ADS_DEVELOPER_TOKEN', configured: false },
  { name: 'Google Maps API', env: 'GOOGLE_MAPS_API_KEY', configured: true },
  { name: 'Netlify Token', env: 'NETLIFY_AUTH_TOKEN', configured: true },
  { name: 'Telegram Bot Token', env: 'TELEGRAM_BOT_TOKEN', configured: true },
]

export default function SystemPage() {
  const onlineCount = systemServices.filter(s => s.status === 'online').length
  const activeIntegrations = integrations.filter(i => i.status === 'active').length
  const configuredKeys = API_KEYS.filter(k => k.configured).length

  return (
    <div className="px-5 py-6 max-w-6xl mx-auto space-y-8 overflow-y-auto">
      <div>
        <h1 className="text-[10px] tracking-[3px] uppercase text-[#00e5ff] mb-1">System Status</h1>
        <p className="text-[#444] text-xs">{onlineCount}/{systemServices.length} services online &middot; {activeIntegrations} integrations active &middot; {configuredKeys}/{API_KEYS.length} API keys configured</p>
      </div>

      {/* Server Identity */}
      <section>
        <SectionTitle>Server Identity</SectionTitle>
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-5 flex flex-col sm:flex-row gap-6">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#00e5ff]/10 border border-[#00e5ff]/25 flex items-center justify-center text-[#00e5ff] font-bold text-sm shadow-[0_0_10px_rgba(0,229,255,0.3)]">
                ER
              </div>
              <div>
                <p className="text-sm font-semibold text-[#e8e8e8]">Erel</p>
                <p className="text-[11px] text-[#555]">AI Marketing Server &middot; Evrnew LLC</p>
              </div>
              <span className="ml-auto flex items-center gap-1.5">
                <span className="w-2 h-2 bg-[#22c55e] rounded-full animate-pulse inline-block" />
                <span className="text-[11px] text-[#22c55e]">Online</span>
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <Stat label="Hostname" value="erel.local" />
              <Stat label="Hardware" value="Mac Mini M4 Pro" />
              <Stat label="CPU" value="12-core M4 Pro" />
              <Stat label="RAM" value="24 GB unified" />
              <Stat label="Storage" value="1 TB SSD" />
              <Stat label="OS" value="macOS Sequoia" />
            </div>
          </div>
          <div className="sm:w-64 space-y-2 text-xs">
            <p className="text-[10px] tracking-widest uppercase text-[#333] mb-2">Services Running</p>
            <div className="space-y-1.5">
              {['CrewAI (8 agents)', 'Gmail Inbox Monitor', 'Telegram Bot', 'Ollama llama3.2:3b', 'n8n Automation', 'Moltbook Heartbeat'].map(s => (
                <div key={s} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#22c55e] rounded-full inline-block shrink-0" />
                  <span className="text-[#555]">{s}</span>
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
          {systemServices.map(service => {
            const style = HEALTH_STYLES[service.status]
            return (
              <div key={service.id} className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-4 hover:border-[#333] transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[#e8e8e8]">{service.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full inline-block ${style.dot}`} />
                    <span className="text-[10px]" style={{ color: style.color }}>{style.label}</span>
                  </div>
                </div>
                <p className="text-[11px] text-[#444] leading-snug mb-2">{service.description}</p>
                <div className="flex items-center justify-between text-[10px] text-[#333]">
                  {service.uptime && <span>Uptime: <span className="text-[#555]">{service.uptime}</span></span>}
                  <span>Checked: {new Date(service.lastChecked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {service.endpoint && (
                  <p className="text-[10px] text-[#333] mt-1">{service.endpoint}</p>
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
            <div key={mcp.name} className="bg-[#111111] border border-[#2a2a2a] rounded-lg px-4 py-3 flex items-start gap-3">
              <div className="w-6 h-6 rounded bg-[#7c3aed]/15 border border-[#7c3aed]/25 flex items-center justify-center shrink-0 mt-0.5">
                <span className="w-1.5 h-1.5 bg-[#22c55e] rounded-full inline-block" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#a78bfa]">{mcp.name}</p>
                <p className="text-[11px] text-[#444] leading-snug">{mcp.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Integrations */}
      <section>
        <SectionTitle>Integrations</SectionTitle>
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg overflow-hidden">
          <div className="grid grid-cols-3 text-[10px] uppercase tracking-widest text-[#333] px-4 py-2 border-b border-[#1e1e1e]">
            <span>Integration</span>
            <span>Purpose</span>
            <span>Status</span>
          </div>
          {integrations.map((intg, i) => (
            <div
              key={intg.name}
              className={`grid grid-cols-3 items-center px-4 py-2.5 text-xs ${i < integrations.length - 1 ? 'border-b border-[#1a1a1a]' : ''}`}
            >
              <span className="text-[#e8e8e8] font-medium">{intg.name}</span>
              <span className="text-[#555] pr-4">{intg.purpose}</span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full inline-block ${
                    intg.status === 'active' ? 'bg-[#22c55e]' :
                    intg.status === 'pending' ? 'bg-[#facc15] animate-pulse' :
                    'bg-[#ef4444]'
                  }`}
                />
                <span className={
                  intg.status === 'active' ? 'text-[#22c55e]' :
                  intg.status === 'pending' ? 'text-[#facc15]' :
                  'text-[#ef4444]'
                }>
                  {intg.status}
                </span>
                {intg.note && <span className="text-[#444] text-[10px]">— {intg.note}</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Cron Schedule */}
      <section>
        <SectionTitle>Cron Schedule</SectionTitle>
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg overflow-hidden">
          <div className="grid grid-cols-4 text-[10px] uppercase tracking-widest text-[#333] px-4 py-2 border-b border-[#1e1e1e]">
            <span>Job</span>
            <span>Schedule</span>
            <span>Last Run</span>
            <span>Status</span>
          </div>
          {CRON_JOBS.map((job, i) => (
            <div
              key={job.name}
              className={`grid grid-cols-4 items-center px-4 py-2.5 text-xs ${i < CRON_JOBS.length - 1 ? 'border-b border-[#1a1a1a]' : ''}`}
            >
              <div>
                <p className="text-[#e8e8e8] font-medium">{job.name}</p>
                <p className="text-[10px] text-[#444]">{job.description}</p>
              </div>
              <span className="text-[#a78bfa] font-mono text-[11px]">{job.schedule}</span>
              <span className="text-[#555]">{new Date(job.lastRun).toLocaleDateString()}</span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-[#22c55e] rounded-full inline-block" />
                <span className="text-[#22c55e]">ok</span>
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
              className={`bg-[#111111] border rounded-lg px-3 py-2.5 flex items-start gap-2.5 ${key.configured ? 'border-[#2a2a2a]' : 'border-[#ef4444]/20'}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 inline-block ${key.configured ? 'bg-[#22c55e]' : 'bg-[#ef4444] animate-pulse'}`} />
              <div>
                <p className="text-[11px] font-medium text-[#e8e8e8]">{key.name}</p>
                <p className="text-[10px] text-[#444] font-mono">{key.env}</p>
                <p className={`text-[10px] mt-0.5 ${key.configured ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
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
    <h2 className="text-[10px] tracking-[3px] uppercase text-[#00e5ff] mb-3 pb-2 border-b border-[#2a2a2a]">
      {children}
    </h2>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#0d0d0d] rounded px-3 py-2">
      <p className="text-[9px] text-[#333] uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-[#666]">{value}</p>
    </div>
  )
}
