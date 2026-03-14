// Overview — System Overview screen.
// Preserves and modernizes the original EREL.AI dashboard content.

import { mcpServers, systemAgents, systemServices } from '@/lib/data'
import IntegrationsTable from '@/app/components/IntegrationsTable'
import CollapsibleSection from '@/app/components/CollapsibleSection'

const badge = (color: string, text: string) => {
  const colors: Record<string, string> = {
    blue: 'bg-sky-50 text-sky-600 border-sky-400',
    purple: 'bg-violet-50 text-violet-600 border-violet-400',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-400',
    yellow: 'bg-amber-50 text-amber-500 border-amber-400',
    red: 'bg-red-50 text-red-600 border-[#ff2d55]/25',
  }
  return (
    <span className={`inline-block text-[10px] px-2 py-0.5 rounded border font-medium tracking-wide ${colors[color] ?? colors.blue}`}>
      {text}
    </span>
  )
}

export default function OverviewPage() {
  return (
    <div className="px-6 py-8 max-w-5xl mx-auto space-y-12">

      {/* Page title */}
      <div>
        <h1 className="text-[11px] tracking-[3px] uppercase text-sky-600 mb-1">System Overview</h1>
        <p className="text-slate-500 text-xs">EREL.AI — Evrnew LLC Autonomous AI Marketing &amp; Operations Server</p>
      </div>

      {/* Company Context */}
      <CollapsibleSection title="Company Context">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card>
            <CardTitle>Business</CardTitle>
            <p className="text-slate-500 text-xs">Evrnew LLC — Residential &amp; commercial insulation contractor serving the greater Pacific Northwest.</p>
          </Card>
          <Card>
            <CardTitle>Service Area</CardTitle>
            <ul className="space-y-1 text-slate-500 text-xs">
              {['King County', 'Snohomish County', 'Skagit County', 'Seattle · Bellevue · Everett', 'Marysville · Arlington · Bellingham'].map(s => (
                <li key={s} className="before:content-['→_'] before:text-sky-600">{s}</li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardTitle>Services</CardTitle>
            <ul className="space-y-1 text-slate-500 text-xs">
              {['Spray foam insulation', 'Blown-in insulation', 'Batt insulation', 'Crawl space encapsulation', 'Attic insulation'].map(s => (
                <li key={s} className="before:content-['→_'] before:text-sky-600">{s}</li>
              ))}
            </ul>
          </Card>
        </div>
      </CollapsibleSection>

      {/* System Architecture */}
      <CollapsibleSection title="System Architecture">
        <Card className="mb-3">
          <CardTitle>Overview</CardTitle>
          <p className="text-slate-500 text-xs leading-relaxed">
            CrewAI orchestrates 8 specialized marketing agents running 24/7 on this server. Each agent is assigned a specific domain, LLM model, and toolset. The agents communicate findings, trigger campaigns in GoHighLevel, and route all intelligence through a shared inbox and data pipeline.
          </p>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card>
            <CardTitle>Core Framework</CardTitle>
            <ul className="space-y-1 text-slate-500 text-xs">
              <li className="before:content-['→_'] before:text-sky-600">OpenClaw Gateway v2026.3.8 — AI agent runtime</li>
              <li className="before:content-['→_'] before:text-sky-600">Python 3.12 venv at <Code>~/evrnew-venv</Code> (CrewAI 1.10.0)</li>
              <li className="before:content-['→_'] before:text-sky-600">n8n 2.10.2 — workflow automation</li>
              <li className="before:content-['→_'] before:text-sky-600">Ollama (llama3.2:3b) — local inference</li>
            </ul>
          </Card>
          <Card>
            <CardTitle>AI Models</CardTitle>
            <ul className="space-y-1 text-slate-500 text-xs">
              <li className="before:content-['→_'] before:text-sky-600">Claude Sonnet 4.6 — primary agent model (OpenClaw)</li>
              <li className="before:content-['→_'] before:text-sky-600">Grok Fast (xAI) — monitoring &amp; high-volume</li>
              <li className="before:content-['→_'] before:text-sky-600">Ollama llama3.2:3b — local fallback</li>
            </ul>
          </Card>
        </div>
      </CollapsibleSection>

      {/* Integrations */}
      <CollapsibleSection title="Integrations & API Status">
        <Card>
          <IntegrationsTable />
        </Card>
      </CollapsibleSection>

      {/* The 8 Agents */}
      <CollapsibleSection title="The 8 System Agents">
        <Card className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                {['Agent', 'Schedule', 'LLM', 'Key Tools'].map(h => (
                  <th key={h} className="text-left text-[10px] tracking-widest uppercase text-slate-500 pb-3 pr-4 border-b border-slate-200">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {systemAgents.map((a) => (
                <tr key={a.id} className="border-b border-[#ffffff04] last:border-0">
                  <td className="py-2.5 pr-4">
                    <span className="inline-block text-[10px] px-2 py-0.5 rounded border font-medium tracking-wide bg-emerald-50 text-emerald-600 border-emerald-400">{a.role.replace(' Agent', '')}</span>
                  </td>
                  <td className="py-2.5 pr-4 text-slate-500">{a.schedule}</td>
                  <td className="py-2.5 pr-4"><Code>{a.llm}</Code></td>
                  <td className="py-2.5 text-slate-400">{a.tools.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </CollapsibleSection>

      {/* Telegram Bot */}
      <CollapsibleSection title="Telegram Bot — @theErelbot">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card>
            <div className="mb-2">{badge('green', 'live — openclaw powered')}</div>
            <CardTitle>Bot: @theErelbot</CardTitle>
            <p className="text-slate-500 text-xs mb-3">Powered by OpenClaw Gateway. Claude Sonnet 4.6 model. Full tool access including Brave Search, BrowserBase, and shell execution. Handles DMs and the Evrnew Marketing group.</p>
            <ul className="space-y-1 text-slate-500 text-xs">
              <li className="before:content-['→_'] before:text-sky-600">DMs from Spencer (8688596596) and Johnny (8733921180)</li>
              <li className="before:content-['→_'] before:text-sky-600">Evrnew Marketing group (chat ID: -5294204937)</li>
              <li className="before:content-['→_'] before:text-sky-600">Free-text → full Claude Sonnet 4.6 response with tool use</li>
              <li className="before:content-['→_'] before:text-sky-600">No code blocks or markdown in Telegram responses — plain text only</li>
            </ul>
          </Card>
          <Card>
            <CardTitle>Infrastructure</CardTitle>
            <ul className="space-y-1 text-slate-500 text-xs mb-4">
              <li className="before:content-['→_'] before:text-sky-600">OpenClaw gateway: <Code>http://localhost:18789</Code></li>
              <li className="before:content-['→_'] before:text-sky-600">LaunchAgent: <Code>ai.openclaw.gateway</Code></li>
              <li className="before:content-['→_'] before:text-sky-600">Config: <Code>~/Projects/OpenClaw/openclaw.json</Code></li>
              <li className="before:content-['→_'] before:text-sky-600">Reinstall guide: <Code>~/Desktop/000Earl000.rtf</Code></li>
            </ul>
            <CardTitle>Key People</CardTitle>
            <p className="text-slate-400 text-xs">Spencer Michael (team lead) · Johnny Walker (crew)</p>
          </Card>
        </div>
      </CollapsibleSection>

      {/* Moltbook */}
      <CollapsibleSection title="Moltbook Agent — erel_evrnew">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card>
            <div className="mb-2">{badge('yellow', 'claim pending')}</div>
            <CardTitle>Agent: erel_evrnew</CardTitle>
            <p className="text-slate-500 text-xs mb-3">Decentralized AI agent social network. Heartbeat runs every 30 minutes.</p>
            <ul className="space-y-1 text-slate-500 text-xs">
              <li className="before:content-['→_'] before:text-sky-600">Profile: <Code>moltbook.com/u/erel_evrnew</Code></li>
              <li className="before:content-['→_'] before:text-sky-600">Heartbeat: <Code>scripts/moltbook_heartbeat.py</Code></li>
              <li className="before:content-['→_'] before:text-sky-600">LaunchAgent: <Code>com.evrnew.moltbook-heartbeat</Code></li>
              <li className="before:content-['→_'] before:text-sky-600">Credentials: <Code>~/.config/moltbook/credentials.json</Code></li>
            </ul>
          </Card>
          <Card>
            <CardTitle>Claim Required</CardTitle>
            <p className="text-slate-500 text-xs mb-3">Tweet verification code to claim the agent:</p>
            <p className="text-slate-400 text-xs italic leading-relaxed">&quot;I&apos;m claiming my AI agent &apos;erel_evrnew&apos; on @moltbook Verification: swim-8NS3&quot;</p>
          </Card>
        </div>
      </CollapsibleSection>

      {/* Email Routing */}
      <CollapsibleSection title="Email Inbox Routing">
        <Card className="overflow-x-auto">
          <p className="text-slate-500 text-xs mb-4">Gmail API daemon (<Code>erel_inbox_monitor.py</Code>) runs 24/7. Polls <Code>erel@evrnew.com</Code> every 5 minutes. Routes emails to agent inboxes as JSON.</p>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                {['Rule', 'Match', 'Routes To', 'Priority'].map(h => (
                  <th key={h} className="text-left text-[10px] tracking-widest uppercase text-slate-500 pb-3 pr-4 border-b border-slate-200">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Google Alerts', 'googlealerts-noreply@google.com', 'competitive_intelligence', 'Normal'],
                ['GHL Notifications', 'notifications@gohighlevel.com', 'email_drip', 'High'],
                ['Review Alerts', 'noreply@google.com + "review"', 'competitive_intelligence', 'High'],
                ['Competitor News', 'Subject: insulation / energy', 'competitive_intelligence', 'Low'],
                ['SEO Reports', 'dataforseo.com / searchconsole', 'technical_seo', 'Normal'],
                ['Ad Alerts', 'ads-noreply@google.com / facebookmail', 'ads_agent', 'High'],
              ].map(([rule, match, to, priority]) => (
                <tr key={rule} className="border-b border-[#ffffff04] last:border-0">
                  <td className="py-2.5 pr-4 text-slate-600">{rule}</td>
                  <td className="py-2.5 pr-4"><Code>{match}</Code></td>
                  <td className="py-2.5 pr-4">{badge('blue', to as string)}</td>
                  <td className="py-2.5 text-slate-400">{priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </CollapsibleSection>

      {/* MCP Servers */}
      <CollapsibleSection title="MCP Servers">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {mcpServers.map((mcp) => (
            <Card key={mcp.name}>
              <div className="mb-2">{badge('green', 'active')}</div>
              <CardTitle>{mcp.name}</CardTitle>
              <p className="text-slate-400 text-xs">{mcp.description}</p>
            </Card>
          ))}
        </div>
      </CollapsibleSection>


      {/* Infrastructure */}
      <CollapsibleSection title="Infrastructure & Maintenance">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card>
            <CardTitle>System Services</CardTitle>
            <ul className="space-y-1 text-slate-500 text-xs">
              <li className="before:content-['→_'] before:text-sky-600">Firewall: enabled</li>
              <li className="before:content-['→_'] before:text-sky-600">Sleep: disabled (SleepDisabled=1)</li>
              <li className="before:content-['→_'] before:text-sky-600">Auto-restart on power loss: on</li>
              <li className="before:content-['→_'] before:text-sky-600">Wake on LAN: on</li>
              <li className="before:content-['→_'] before:text-sky-600">Auto-login as <Code>erel</Code></li>
              <li className="before:content-['→_'] before:text-sky-600">Auto-updates: disabled</li>
            </ul>
          </Card>
          <Card>
            <CardTitle>Cron Schedule</CardTitle>
            <ul className="space-y-1 text-slate-500 text-xs mb-4">
              <li className="before:content-['→_'] before:text-sky-600">Every 15 min: health check</li>
              <li className="before:content-['→_'] before:text-sky-600">Sunday 3am: log rotation</li>
              <li className="before:content-['→_'] before:text-sky-600">Sunday 4am: disk cleanup</li>
            </ul>
            <CardTitle>Log Files</CardTitle>
            <ul className="space-y-1 text-slate-500 text-xs">
              <li className="before:content-['→_'] before:text-sky-600"><Code>logs/erel-inbox.log</Code></li>
              <li className="before:content-['→_'] before:text-sky-600"><Code>logs/health.log</Code></li>
              <li className="before:content-['→_'] before:text-sky-600"><Code>logs/erel-inbox-stderr.log</Code></li>
            </ul>
          </Card>
        </div>
      </CollapsibleSection>

      {/* Project Structure */}
      <CollapsibleSection title="Project Structure">
        <Card>
          <pre className="text-[11px] text-slate-400 leading-relaxed overflow-x-auto whitespace-pre">
{`~/evrnew-marketing/
├── agents/
│   ├── email-inbox/
│   │   ├── erel_inbox_monitor.py   `}<span className="text-sky-600">← 24/7 Gmail daemon</span>{`
│   │   ├── gmail_auth.py           `}<span className="text-sky-600">← one-time OAuth setup</span>{`
│   │   └── erel_send.py
│   └── telegram-bot/
│       ├── bot.py                  `}<span className="text-sky-600">← Telegram bot (PTB polling)</span>{`
│       └── webhook.py
├── config/
│   ├── agents.yaml                 `}<span className="text-sky-600">← all 8 agent definitions</span>{`
│   ├── gmail/credentials.json
│   ├── mcp/claude-mcp-config.json  `}<span className="text-sky-600">← MCP server config</span>{`
│   └── prompts/base_system_prompt.txt
├── data/inbox/                     `}<span className="text-sky-600">← routed email JSON files</span>{`
├── logs/
├── scripts/
│   ├── moltbook_heartbeat.py       `}<span className="text-sky-600">← 30min heartbeat</span>{`
│   └── cron/{health-check,log-rotate,disk-cleanup,restart-services}.sh
└── sites/openclaw-site/            `}<span className="text-sky-600">← this Mission Control app</span>
          </pre>
        </Card>
      </CollapsibleSection>

      {/* Tech Stack */}
      <CollapsibleSection title="Full Tech Stack">
        <Card>
          <div className="flex flex-wrap gap-2">
            {[
              ['blue', 'Python 3.12'],
              ['blue', 'CrewAI 1.10.0'],
              ['blue', 'OpenClaw Gateway'],
              ['blue', 'Anthropic SDK 0.84.0'],
              ['blue', 'OpenAI SDK 2.24.0'],
              ['blue', 'Playwright 1.58.0'],
              ['blue', 'google-auth-oauthlib'],
              ['blue', 'langchain-anthropic 1.3.4'],
              ['purple', 'n8n 2.10.2'],
              ['purple', 'Node.js 25.7.0'],
              ['purple', 'Next.js 15'],
              ['purple', 'TypeScript'],
              ['purple', 'Tailwind CSS'],
              ['green', 'Ollama'],
              ['green', 'llama3.2:3b'],
              ['green', 'ChromaDB 1.1.1'],
              ['green', 'pandas 3.0.1'],
              ['yellow', 'BrowserBase SDK 1.5.0'],
              ['yellow', 'Brave Browser'],
              ['yellow', 'OpenClaw v2026.3.8'],
              ['red', 'macOS LaunchAgents'],
              ['red', 'launchd / cron'],
              ['red', 'Homebrew 5.0.16'],
            ].map(([color, label]) => (
              <span key={label}>{badge(color, label)}</span>
            ))}
          </div>
        </Card>
      </CollapsibleSection>

      {/* Self-maintenance commands */}
      <CollapsibleSection title="Self-Maintenance Commands">
        <Card>
          <ul className="space-y-1 text-xs">
            <li><Code>~/evrnew-marketing/scripts/cron/health-check.sh</Code> <span className="text-slate-400">— system health check</span></li>
            <li><Code>~/evrnew-marketing/scripts/cron/restart-services.sh [all|inbox|ollama|n8n]</Code></li>
            <li><Code>~/evrnew-marketing/scripts/cron/log-rotate.sh</Code></li>
            <li><Code>~/evrnew-marketing/scripts/cron/disk-cleanup.sh</Code></li>
            <li><Code>tail -f ~/evrnew-marketing/logs/health.log</Code></li>
          </ul>
        </Card>
      </CollapsibleSection>

      <footer className="text-center text-slate-400 text-[11px] pt-4 pb-8 border-t border-slate-200">
        <span className="text-sky-600">EREL.AI</span> — Evrnew LLC Autonomous Marketing &amp; Operations Server &nbsp;|&nbsp; March 2026
      </footer>
    </div>
  )
}


function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-slate-50 border border-slate-200 rounded-lg p-4 hover:shadow-md hover:border-slate-300 transition-all ${className}`}>
      {children}
    </div>
  )
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[13px] font-semibold text-slate-900 mb-2">{children}</h3>
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-slate-100 text-sky-600 text-[11px] px-1.5 py-0.5 rounded">
      {children}
    </code>
  )
}
