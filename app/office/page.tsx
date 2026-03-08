'use client'

let liveData: any = {}
try { liveData = require('@/lib/data/live.json') } catch {}

const AGENTS = [
  {
    id: 'competitive',
    role: 'Competitive Intelligence',
    plist: 'com.evrnew.agent-competitive',
    schedule: 'Daily 6:00 AM',
    logKey: 'competitive',
    color: '#00b4d8',
    outputCount: () => {
      try { return (liveData.competitive?.content?.length ?? 0) > 0 ? 1 : 0 } catch { return 0 }
    },
  },
  {
    id: 'ads',
    role: 'Google & Meta Ads',
    plist: 'com.evrnew.agent-ads',
    schedule: 'Every 6 hours',
    logKey: 'ads',
    color: '#f59e0b',
    outputCount: () => {
      try { return (liveData.ads?.google?.length ?? 0) + (liveData.ads?.meta?.length ?? 0) } catch { return 0 }
    },
  },
  {
    id: 'blog-seo',
    role: 'Blog & SEO Content',
    plist: 'com.evrnew.agent-blog-seo',
    schedule: 'Mon & Thu 9:00 AM',
    logKey: 'blogSeo',
    color: '#f97316',
    outputCount: () => 0,
  },
  {
    id: 'content',
    role: 'General Content',
    plist: 'com.evrnew.agent-content',
    schedule: 'Daily 7:00 AM',
    logKey: 'content',
    color: '#8b5cf6',
    outputCount: () => 0,
  },
  {
    id: 'strategy',
    role: 'Marketing Strategy',
    plist: 'com.evrnew.agent-strategy',
    schedule: 'Weekly Mon 8:00 AM',
    logKey: 'strategy',
    color: '#0ea5e9',
    outputCount: () => {
      try { return (liveData.strategy?.content?.length ?? 0) > 0 ? 1 : 0 } catch { return 0 }
    },
  },
  {
    id: 'social',
    role: 'Social Media',
    plist: 'com.evrnew.agent-social',
    schedule: 'Daily 8:00 AM',
    logKey: 'social',
    color: '#ec4899',
    outputCount: () => {
      try {
        const s = liveData.social || {}
        return (s.facebook?.length ?? 0) + (s.instagram?.length ?? 0) + (s.google_business?.length ?? 0)
      } catch { return 0 }
    },
  },
  {
    id: 'technical-seo',
    role: 'Technical SEO',
    plist: 'com.evrnew.agent-technical-seo',
    schedule: 'Weekly Wed 10:00 AM',
    logKey: 'technicalSeo',
    color: '#10b981',
    outputCount: () => 0,
  },
  {
    id: 'email-drip',
    role: 'Email Drip',
    plist: 'com.evrnew.agent-email-drip',
    schedule: 'Weekly Tue 9:00 AM',
    logKey: 'emailDrip',
    color: '#ef4444',
    outputCount: () => {
      try { return liveData.emailDrip?.sequences?.length ?? 0 } catch { return 0 }
    },
  },
]

const AGENT_LOG_COLORS: Record<string, string> = {
  ads:          '#f59e0b',
  social:       '#ec4899',
  competitive:  '#00b4d8',
  strategy:     '#0ea5e9',
  blogSeo:      '#f97316',
  technicalSeo: '#10b981',
  emailDrip:    '#ef4444',
  content:      '#8b5cf6',
  inbox:        '#64748b',
  telegram:     '#0088cc',
  moltbook:     '#a855f7',
  health:       '#16a34a',
}

function countRunsToday(lines: string[]): number {
  const today = new Date().toISOString().slice(0, 10)
  return lines.filter((l: string) => l.includes(today)).length
}

function buildCombinedFeed(agentLogs: Record<string, string[]>): { agent: string; line: string; color: string }[] {
  const feed: { agent: string; line: string; color: string }[] = []
  for (const [key, lines] of Object.entries(agentLogs)) {
    const color = AGENT_LOG_COLORS[key] || '#94a3b8'
    for (const line of lines as string[]) {
      feed.push({ agent: key, line, color })
    }
  }
  return feed.slice(-50)
}

export default function OfficePage() {
  const agentLogs: Record<string, string[]> = liveData.agentLogs || {}
  const generatedAt = liveData.generatedAt ? new Date(liveData.generatedAt).toLocaleString() : 'Not yet generated'

  const googleAdsCount = liveData.ads?.google?.length ?? 0
  const metaAdsCount = liveData.ads?.meta?.length ?? 0
  const socialCount = (liveData.social?.facebook?.length ?? 0) + (liveData.social?.instagram?.length ?? 0) + (liveData.social?.google_business?.length ?? 0)
  const emailSeqCount = liveData.emailDrip?.sequences?.length ?? 0
  const strategyRuns = (liveData.strategy?.content?.length ?? 0) > 0 ? 1 : 0
  const competitiveRuns = (liveData.competitive?.content?.length ?? 0) > 0 ? 1 : 0

  const combinedFeed = buildCombinedFeed(agentLogs)

  return (
    <div className="px-5 py-6 max-w-6xl mx-auto space-y-8 overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[10px] tracking-[3px] uppercase font-bold mb-1" style={{ color: '#0077b6' }}>
            Marketing Ops Room
          </h1>
          <p className="text-xs text-slate-500">Agent status, live outputs, and terminal feed</p>
        </div>
        <div className="flex items-center gap-2 rounded-full px-3 py-1.5 border-2" style={{ background: '#f0fdf4', borderColor: '#16a34a' }}>
          <span className="w-2 h-2 rounded-full inline-block animate-pulse" style={{ background: '#16a34a' }} />
          <span className="text-[11px] font-bold tracking-widest" style={{ color: '#15803d' }}>8/8 ONLINE</span>
        </div>
      </div>

      {/* Output Summary Tiles */}
      <section>
        <h2 className="text-[10px] tracking-[3px] uppercase text-sky-600 font-bold mb-3 pb-2 border-b border-slate-200">
          Output Summary
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Google Ads',      value: googleAdsCount,  color: '#f59e0b', bg: '#fffbeb', border: '#f59e0b' },
            { label: 'Meta Ads',        value: metaAdsCount,    color: '#3b82f6', bg: '#eff6ff', border: '#93c5fd' },
            { label: 'Social Posts',    value: socialCount,     color: '#ec4899', bg: '#fdf4ff', border: '#f0abfc' },
            { label: 'Email Seqs',      value: emailSeqCount,   color: '#ef4444', bg: '#fef2f2', border: '#fca5a5' },
            { label: 'Strategy',        value: strategyRuns,    color: '#0ea5e9', bg: '#f0f9ff', border: '#7dd3fc' },
            { label: 'Intel Reports',   value: competitiveRuns, color: '#00b4d8', bg: '#ecfeff', border: '#67e8f9' },
          ].map(s => (
            <div key={s.label} className="rounded-lg p-3 border-2 text-center" style={{ background: s.bg, borderColor: s.border }}>
              <p className="text-[9px] uppercase tracking-widest font-bold mb-1" style={{ color: s.color }}>{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Agent Status Grid */}
      <section>
        <h2 className="text-[10px] tracking-[3px] uppercase text-sky-600 font-bold mb-3 pb-2 border-b border-slate-200">
          Agent Status Grid
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {AGENTS.map(agent => {
            const lines: string[] = agentLogs[agent.logKey] || []
            const last3 = lines.slice(-3)
            const runsToday = countRunsToday(lines)
            const outputCount = agent.outputCount()

            return (
              <div
                key={agent.id}
                className="rounded-xl border-2 overflow-hidden bg-white"
                style={{ borderColor: agent.color }}
              >
                <div
                  className="px-4 py-3 flex items-center justify-between gap-3"
                  style={{ borderBottom: `2px solid ${agent.color}20`, background: `${agent.color}08` }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ background: agent.color }}
                    >
                      {agent.id.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-[12px] text-slate-900 truncate">{agent.role}</p>
                      <p className="text-[9px] font-mono text-slate-400 truncate">{agent.plist}</p>
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-1 shrink-0 rounded-full px-2 py-0.5 border"
                    style={{ background: `${agent.color}15`, borderColor: agent.color }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full inline-block animate-pulse" style={{ background: agent.color }} />
                    <span className="text-[9px] font-bold" style={{ color: agent.color }}>ACTIVE</span>
                  </div>
                </div>

                <div className="px-4 py-2 grid grid-cols-3 gap-2 text-[10px] border-b border-slate-100">
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase tracking-wide">Schedule</p>
                    <p className="text-slate-600 mt-0.5">{agent.schedule}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase tracking-wide">Runs Today</p>
                    <p className="text-slate-600 mt-0.5">{runsToday || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase tracking-wide">Outputs</p>
                    <p className="font-bold mt-0.5" style={{ color: agent.color }}>{outputCount}</p>
                  </div>
                </div>

                <div className="px-4 py-3 bg-slate-950 font-mono text-[10px] space-y-0.5 min-h-[60px]">
                  {last3.length === 0 ? (
                    <span className="text-slate-600">— no recent logs —</span>
                  ) : (
                    last3.map((line, i) => (
                      <div key={i} className="text-slate-400 truncate">{line}</div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Live Terminal Feed */}
      <section>
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
          <h2 className="text-[10px] tracking-[3px] uppercase text-sky-600 font-bold">
            Live Terminal Feed
          </h2>
          <span className="text-[9px] text-slate-400 font-mono">Last built: {generatedAt}</span>
        </div>
        <div className="rounded-xl bg-slate-950 p-4 font-mono text-[10px] space-y-0.5 overflow-x-auto max-h-[500px] overflow-y-auto">
          {combinedFeed.length === 0 ? (
            <span className="text-slate-600">— no log data available. Run the prebuild script to populate —</span>
          ) : (
            combinedFeed.map((entry, i) => (
              <div key={i} className="flex gap-2">
                <span className="font-bold shrink-0" style={{ color: entry.color }}>[{entry.agent}]</span>
                <span className="text-slate-400">{entry.line}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
