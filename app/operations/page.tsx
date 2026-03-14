'use client'

const agents = [
  {
    id: 1,
    role: 'Competitive Intelligence Agent',
    plist: 'com.evrnew.agent-competitive',
    status: 'active',
    schedule: 'Daily 6:00 AM',
    llm: 'claude-haiku',
    lastRun: 'Today 6:00 AM',
    description: 'Monitors SERP rankings, competitor ad spend, and Facebook Ad Library for the PNW insulation market',
    tools: ['DataForSEO', 'FB Ad Library', 'Google Search', 'Anthropic'],
    outputDir: 'data/competitors/',
    accentColor: '#00b4d8',
  },
  {
    id: 2,
    role: 'Google & Meta Ads Agent',
    plist: 'com.evrnew.agent-ads',
    status: 'active',
    schedule: 'Every 6 hours',
    llm: 'claude-haiku',
    lastRun: 'Today 2:00 PM',
    description: 'Generates A/B/C ad copy for Google Search and Facebook/Instagram targeting PNW homeowners',
    tools: ['Anthropic', 'Google Ads API', 'Meta API'],
    outputDir: 'data/ads/',
    accentColor: '#f59e0b',
  },
  {
    id: 3,
    role: 'Blog & SEO Content Agent',
    plist: 'com.evrnew.agent-blog-seo',
    status: 'active',
    schedule: 'Mon & Thu 9:00 AM',
    llm: 'claude-haiku',
    lastRun: 'Mon Mar 3, 9:00 AM',
    description: 'Generates local SEO blog posts targeting PNW insulation keywords across King, Snohomish & Skagit counties',
    tools: ['Anthropic', 'DataForSEO'],
    outputDir: 'data/blog-seo/',
    accentColor: '#f97316',
  },
  {
    id: 4,
    role: 'General Content Agent',
    plist: 'com.evrnew.agent-content',
    status: 'active',
    schedule: 'Daily 7:00 AM',
    llm: 'claude-haiku',
    lastRun: 'Today 7:00 AM',
    description: 'Generates landing pages, email sequences, service page copy, and FAQ content for EVRNEW markets',
    tools: ['Anthropic'],
    outputDir: 'data/content/',
    accentColor: '#8b5cf6',
  },
  {
    id: 5,
    role: 'Marketing Strategy Agent',
    plist: 'com.evrnew.agent-strategy',
    status: 'active',
    schedule: 'Weekly Mon 8:00 AM',
    llm: 'claude-haiku',
    lastRun: 'Mon Mar 3, 8:00 AM',
    description: 'Synthesizes competitive intel and market data into weekly marketing strategy briefs',
    tools: ['Anthropic', 'Competitive Data'],
    outputDir: 'data/strategy/',
    accentColor: '#0ea5e9',
  },
  {
    id: 6,
    role: 'Social Media Agent',
    plist: 'com.evrnew.agent-social',
    status: 'active',
    schedule: 'Daily 8:00 AM',
    llm: 'claude-haiku',
    lastRun: 'Today 8:00 AM',
    description: 'Generates daily posts for Facebook, Instagram, and Google Business Profile targeting PNW homeowners',
    tools: ['Anthropic', 'Buffer API'],
    outputDir: 'data/social/',
    accentColor: '#ec4899',
  },
  {
    id: 7,
    role: 'Technical SEO Agent',
    plist: 'com.evrnew.agent-technical-seo',
    status: 'active',
    schedule: 'Weekly Wed 10:00 AM',
    llm: 'claude-haiku',
    lastRun: 'Wed Mar 4, 10:00 AM',
    description: 'Generates LocalBusiness schema markup, technical SEO audits, and keyword opportunities for evrnew.com',
    tools: ['Anthropic', 'DataForSEO'],
    outputDir: 'data/seo/',
    accentColor: '#10b981',
  },
  {
    id: 8,
    role: 'Email Drip Agent',
    plist: 'com.evrnew.agent-email-drip',
    status: 'active',
    schedule: 'Weekly Tue 9:00 AM',
    llm: 'claude-haiku',
    lastRun: 'Tue Mar 3, 9:00 AM',
    description: 'Generates 5-email nurture sequences for attic, crawl space, spray foam, post-estimate, and rebate leads',
    tools: ['Anthropic', 'SendGrid'],
    outputDir: 'data/email-drip/',
    accentColor: '#ef4444',
  },
]

const LOG_LINES = [
  { time: '06:00:02', agent: 'competitive', color: '#0077b6', msg: 'Starting SERP crawl for 20 target cities...', success: false },
  { time: '06:00:18', agent: 'competitive', color: '#0077b6', msg: 'Fetched 40 SERP pages — Attic Projects found in 12 results', success: false },
  { time: '06:00:31', agent: 'competitive', color: '#0077b6', msg: 'Saved intel to data/competitors/2026-03-05.md', success: false },
  { time: '06:00:31', agent: 'competitive', color: '#0077b6', msg: '✓ Run complete in 29s — Telegram notified', success: true },
  { time: '07:00:01', agent: 'content', color: '#7c3aed', msg: 'Generating landing pages for 5 target cities...', success: false },
  { time: '07:00:44', agent: 'content', color: '#7c3aed', msg: '✓ 5 landing pages written — saved to data/content/', success: true },
  { time: '08:00:00', agent: 'social', color: '#be185d', msg: 'Generating daily posts for Facebook, Instagram, GBP...', success: false },
  { time: '08:00:38', agent: 'social', color: '#be185d', msg: '✓ 9 posts generated (3 per platform) — saved to data/social/', success: true },
  { time: '09:00:01', agent: 'blog-seo', color: '#c2410c', msg: 'Starting blog post generation — targeting King & Snohomish counties', success: false },
  { time: '09:01:14', agent: 'blog-seo', color: '#c2410c', msg: '✓ 3 blog posts written — saved to data/blog-seo/', success: true },
  { time: '10:00:00', agent: 'technical-seo', color: '#047857', msg: 'Running schema markup generation for evrnew.com...', success: false },
  { time: '10:01:05', agent: 'technical-seo', color: '#047857', msg: '✓ LocalBusiness schema + 8 pages updated — saved to data/seo/', success: true },
  { time: '14:00:00', agent: 'ads', color: '#b45309', msg: 'Generating ad copy batch — 4 ad groups x 3 variants...', success: false },
  { time: '14:01:12', agent: 'ads', color: '#b45309', msg: '✓ 12 ad variants written — saved to data/ads/', success: true },
  { time: '14:00:00', agent: 'strategy', color: '#0369a1', msg: 'Weekly brief synthesis started — pulling competitive data...', success: false },
  { time: '14:02:30', agent: 'strategy', color: '#0369a1', msg: '✓ Strategy brief complete — saved to data/strategy/2026-W10.md', success: true },
  { time: '09:00:02', agent: 'email-drip', color: '#b91c1c', msg: 'Generating nurture sequences — 5 lead types...', success: false },
  { time: '09:01:48', agent: 'email-drip', color: '#b91c1c', msg: '✓ 25 emails written (5 sequences x 5 emails) — saved to data/email-drip/', success: true },
]

const activeCount = agents.filter(a => a.status === 'active').length
const runsToday = agents.filter(a => a.lastRun.startsWith('Today')).length

export default function OperationsPage() {
  return (
    <div className="px-5 py-6 max-w-6xl mx-auto space-y-8" style={{ background: '#ffffff', minHeight: '100%' }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[10px] tracking-[3px] uppercase font-bold mb-1" style={{ color: '#0077b6' }}>Agent Fleet</h1>
          <p className="text-xs" style={{ color: '#64748b' }}>8 autonomous marketing agents running on erel.local</p>
        </div>
        <div className="flex items-center gap-2 rounded-full px-3 py-1.5 border-2" style={{ background: '#f0fdf4', borderColor: '#16a34a' }}>
          <span className="w-2 h-2 rounded-full inline-block animate-pulse" style={{ background: '#16a34a' }} />
          <span className="text-[11px] font-bold tracking-widest" style={{ color: '#15803d' }}>8/8 ONLINE</span>
        </div>
      </div>

      {/* Fleet Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Agents', value: '8', color: '#0077b6', bg: '#e0f2fe', border: '#0077b6' },
          { label: 'Active Now', value: String(activeCount), color: '#16a34a', bg: '#f0fdf4', border: '#16a34a' },
          { label: 'Runs Today', value: String(runsToday), color: '#7c3aed', bg: '#f5f3ff', border: '#7c3aed' },
          { label: 'Outputs Generated', value: '47', color: '#b45309', bg: '#fffbeb', border: '#f59e0b' },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl p-4 border-2" style={{ background: stat.bg, borderColor: stat.border }}>
            <p className="text-[9px] tracking-widest uppercase mb-1 font-semibold" style={{ color: stat.color }}>{stat.label}</p>
            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {agents.map(agent => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>

      {/* Log Section */}
      <div>
        <h2 className="text-[10px] tracking-[3px] uppercase font-bold mb-3 pb-2 border-b-2" style={{ color: '#0077b6', borderColor: '#e2e8f0' }}>
          Recent Agent Activity
        </h2>
        <div className="rounded-xl p-4 font-mono text-[11px] space-y-1 overflow-x-auto border-2" style={{ background: '#0f172a', borderColor: '#1e293b' }}>
          {LOG_LINES.map((line, i) => (
            <div key={i}>
              <span style={{ color: '#475569' }}>[{line.time}] </span>
              <span style={{ color: line.color }} className="font-bold">[{line.agent}]</span>
              <span style={{ color: line.success ? '#4ade80' : '#94a3b8' }}> {line.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

type Agent = typeof agents[number]

function AgentCard({ agent }: { agent: Agent }) {
  const accent = agent.accentColor

  return (
    <div className="rounded-xl overflow-hidden flex flex-col border-2" style={{ background: '#ffffff', borderColor: accent }}>
      {/* Card Header */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3" style={{ borderBottom: `2px solid ${accent}20` }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-white text-[11px] font-bold" style={{ background: accent }}>
            {agent.id}
          </span>
          <div className="min-w-0">
            <p className="font-bold text-sm leading-tight truncate" style={{ color: '#0f172a' }}>{agent.role}</p>
            <p className="text-[9px] font-mono truncate" style={{ color: '#94a3b8' }}>{agent.plist}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 rounded-full px-2.5 py-1 border-2" style={{ background: `${accent}15`, borderColor: accent }}>
          <span className="w-1.5 h-1.5 rounded-full inline-block animate-pulse" style={{ background: accent }} />
          <span className="text-[9px] font-bold tracking-widest" style={{ color: accent }}>ACTIVE</span>
        </div>
      </div>

      {/* Description */}
      <p className="px-4 py-3 text-[11px] leading-snug" style={{ color: '#475569' }}>{agent.description}</p>

      {/* Metrics */}
      <div className="px-4 py-2 grid grid-cols-3 gap-2 text-[10px] border-t" style={{ borderColor: '#f1f5f9' }}>
        <div>
          <span className="mr-1">&#9200;</span>
          <span style={{ color: '#64748b' }}>{agent.schedule}</span>
        </div>
        <div>
          <span className="mr-1">&#129504;</span>
          <span style={{ color: '#64748b' }}>{agent.llm}</span>
        </div>
        <div>
          <span className="mr-1" style={{ color: '#16a34a' }}>&#10003;</span>
          <span style={{ color: '#64748b' }}>{agent.lastRun}</span>
        </div>
      </div>

      {/* Tools */}
      <div className="px-4 pb-3 flex flex-wrap gap-1 items-center">
        <span className="text-[10px] mr-1 font-semibold" style={{ color: '#94a3b8' }}>Tools:</span>
        {agent.tools.map(tool => (
          <span
            key={tool}
            className="text-[10px] px-2 py-0.5 rounded-md font-medium border"
            style={{ background: `${accent}10`, color: accent, borderColor: `${accent}40` }}
          >
            {tool}
          </span>
        ))}
      </div>

      {/* Output Dir */}
      <div className="px-4 pb-3 flex items-center gap-1.5">
        <span className="text-[10px] font-semibold" style={{ color: '#94a3b8' }}>Output:</span>
        <span className="font-mono text-[10px]" style={{ color: '#64748b' }}>{agent.outputDir}</span>
      </div>

      {/* Card Footer */}
      <div className="mt-auto px-4 py-2.5 flex items-center justify-between border-t" style={{ background: `${accent}08`, borderColor: `${accent}30` }}>
        <div>
          <span className="text-[10px]" style={{ color: '#94a3b8' }}>LaunchAgent </span>
          <span className="font-mono text-[10px] font-bold" style={{ color: accent }}>{agent.plist}</span>
        </div>
        <button
          onClick={() => alert(`Agent queued: ${agent.role}`)}
          className="text-[10px] font-bold px-3 py-1 rounded-lg transition-colors"
          style={{ background: accent, color: '#ffffff' }}
        >
          Run Now &#9654;
        </button>
      </div>
    </div>
  )
}
