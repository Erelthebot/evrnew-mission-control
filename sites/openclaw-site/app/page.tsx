// Overview — System Overview screen.
// Preserves and modernizes the original EREL.AI dashboard content.

import { integrations, mcpServers, systemAgents, systemServices } from '@/lib/data'

const badge = (color: string, text: string) => {
  const colors: Record<string, string> = {
    blue: 'bg-[#00e5ff]/10 text-[#00e5ff] border-[#00e5ff]/25',
    purple: 'bg-[#7c3aed]/15 text-[#a78bfa] border-[#7c3aed]/30',
    green: 'bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/25',
    yellow: 'bg-[#facc15]/10 text-[#facc15] border-[#facc15]/25',
    red: 'bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/25',
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
        <h1 className="text-[11px] tracking-[3px] uppercase text-[#00e5ff] mb-1">System Overview</h1>
        <p className="text-[#444] text-xs">EREL.AI — Evrnew LLC Autonomous AI Marketing &amp; Operations Server</p>
      </div>

      {/* Server Identity */}
      <section>
        <SectionTitle>Server Identity</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card>
            <CardTitle>Hardware</CardTitle>
            <ul className="space-y-1 text-[#666] text-xs">
              {['Mac Mini M4 Pro', 'macOS Sequoia 15 (Darwin 25.3)', 'Host: erel.local', '926 GB storage — 11 GB used', 'Auto-login, auto-restart on power loss'].map(s => (
                <li key={s} className="before:content-['→_'] before:text-[#00e5ff]">{s}</li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardTitle>Identity &amp; Access</CardTitle>
            <ul className="space-y-1 text-[#666] text-xs">
              <li className="before:content-['→_'] before:text-[#00e5ff]">Email: <Code>erel@evrnew.com</Code> (Google Workspace)</li>
              <li className="before:content-['→_'] before:text-[#00e5ff]">Passwordless sudo enabled</li>
              <li className="before:content-['→_'] before:text-[#00e5ff]">SSH: <Code>ssh erel@erel.local</Code></li>
              <li className="before:content-['→_'] before:text-[#00e5ff]">Claude Code: unrestricted (empty deny list)</li>
              <li className="before:content-['→_'] before:text-[#00e5ff]">Full machine administrator</li>
            </ul>
          </Card>
        </div>
      </section>

      {/* Company Context */}
      <section>
        <SectionTitle>Company Context</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card>
            <CardTitle>Business</CardTitle>
            <p className="text-[#666] text-xs">Evrnew LLC — Residential &amp; commercial insulation contractor serving the greater Pacific Northwest.</p>
          </Card>
          <Card>
            <CardTitle>Service Area</CardTitle>
            <ul className="space-y-1 text-[#666] text-xs">
              {['King County', 'Snohomish County', 'Skagit County', 'Seattle · Bellevue · Everett', 'Marysville · Arlington · Bellingham'].map(s => (
                <li key={s} className="before:content-['→_'] before:text-[#00e5ff]">{s}</li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardTitle>Services</CardTitle>
            <ul className="space-y-1 text-[#666] text-xs">
              {['Spray foam insulation', 'Blown-in insulation', 'Batt insulation', 'Crawl space encapsulation', 'Attic insulation'].map(s => (
                <li key={s} className="before:content-['→_'] before:text-[#00e5ff]">{s}</li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      {/* System Architecture */}
      <section>
        <SectionTitle>System Architecture</SectionTitle>
        <Card className="mb-3">
          <CardTitle>Overview</CardTitle>
          <p className="text-[#666] text-xs leading-relaxed">
            CrewAI orchestrates 8 specialized marketing agents running 24/7 on this server. Each agent is assigned a specific domain, LLM model, and toolset. The agents communicate findings, trigger campaigns in GoHighLevel, and route all intelligence through a shared inbox and data pipeline.
          </p>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card>
            <CardTitle>Core Framework</CardTitle>
            <ul className="space-y-1 text-[#666] text-xs">
              <li className="before:content-['→_'] before:text-[#00e5ff]">CrewAI 1.10.0 — agent orchestration</li>
              <li className="before:content-['→_'] before:text-[#00e5ff]">Python 3.12 venv at <Code>~/evrnew-venv</Code></li>
              <li className="before:content-['→_'] before:text-[#00e5ff]">n8n 2.10.2 — workflow automation</li>
              <li className="before:content-['→_'] before:text-[#00e5ff]">Ollama (llama3.2:3b) — local inference</li>
            </ul>
          </Card>
          <Card>
            <CardTitle>AI Models</CardTitle>
            <ul className="space-y-1 text-[#666] text-xs">
              <li className="before:content-['→_'] before:text-[#00e5ff]">Claude Sonnet/Opus — content &amp; strategy</li>
              <li className="before:content-['→_'] before:text-[#00e5ff]">Grok Fast (xAI) — monitoring &amp; high-volume</li>
              <li className="before:content-['→_'] before:text-[#00e5ff]">Ollama llama3.2:3b — local fallback</li>
            </ul>
          </Card>
        </div>
      </section>

      {/* The 8 Agents */}
      <section>
        <SectionTitle>The 8 System Agents</SectionTitle>
        <Card className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                {['Agent', 'Role', 'Model', 'Key Tools'].map(h => (
                  <th key={h} className="text-left text-[10px] tracking-widest uppercase text-[#444] pb-3 pr-4 border-b border-[#2a2a2a]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {systemAgents.map((a) => (
                <tr key={a.id} className="border-b border-[#ffffff04] last:border-0">
                  <td className="py-2.5 pr-4">{badge(a.badge, a.name)}</td>
                  <td className="py-2.5 pr-4 text-[#666]">{a.role}</td>
                  <td className="py-2.5 pr-4"><Code>{a.model}</Code></td>
                  <td className="py-2.5 text-[#555]">{a.tools}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      {/* Telegram Bot */}
      <section>
        <SectionTitle>Telegram Bot — @evrnew_agent_bot</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card>
            <div className="mb-2">{badge('green', 'token active')}</div>
            <CardTitle>Bot: @evrnew_agent_bot</CardTitle>
            <p className="text-[#666] text-xs mb-3">python-telegram-bot v22 with polling + optional webhook mode via aiohttp.</p>
            <ul className="space-y-1 text-[#666] text-xs">
              <li className="before:content-['→_'] before:text-[#00e5ff]"><Code>/status</Code> — Moltbook heartbeat + site status</li>
              <li className="before:content-['→_'] before:text-[#00e5ff]"><Code>/brief</Code> — Today&apos;s marketing brief</li>
              <li className="before:content-['→_'] before:text-[#00e5ff]"><Code>/deploy</Code> — Deploy via Netlify CLI</li>
              <li className="before:content-['→_'] before:text-[#00e5ff]"><Code>/agents</Code> — List active agents</li>
              <li className="before:content-['→_'] before:text-[#00e5ff]">Free-text → routed to Claude API</li>
            </ul>
          </Card>
          <Card>
            <CardTitle>Files</CardTitle>
            <ul className="space-y-1 text-[#666] text-xs mb-4">
              <li className="before:content-['→_'] before:text-[#00e5ff]"><Code>agents/telegram-bot/bot.py</Code> — main bot</li>
              <li className="before:content-['→_'] before:text-[#00e5ff]"><Code>agents/telegram-bot/webhook.py</Code> — aiohttp server</li>
              <li className="before:content-['→_'] before:text-[#00e5ff]"><Code>agents/telegram-bot/setup_bot.py</Code> — BotFather auto</li>
            </ul>
            <CardTitle>Token</CardTitle>
            <p className="text-[#555] text-xs">Stored at <Code>~/.config/evrnew/telegram_bot_token</Code> or <Code>TELEGRAM_BOT_TOKEN</Code> env var.</p>
          </Card>
        </div>
      </section>

      {/* Moltbook */}
      <section>
        <SectionTitle>Moltbook Agent — erel_evrnew</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card>
            <div className="mb-2">{badge('yellow', 'claim pending')}</div>
            <CardTitle>Agent: erel_evrnew</CardTitle>
            <p className="text-[#666] text-xs mb-3">Decentralized AI agent social network. Heartbeat runs every 30 minutes.</p>
            <ul className="space-y-1 text-[#666] text-xs">
              <li className="before:content-['→_'] before:text-[#00e5ff]">Profile: <Code>moltbook.com/u/erel_evrnew</Code></li>
              <li className="before:content-['→_'] before:text-[#00e5ff]">Heartbeat: <Code>scripts/moltbook_heartbeat.py</Code></li>
              <li className="before:content-['→_'] before:text-[#00e5ff]">LaunchAgent: <Code>com.evrnew.moltbook-heartbeat</Code></li>
              <li className="before:content-['→_'] before:text-[#00e5ff]">Credentials: <Code>~/.config/moltbook/credentials.json</Code></li>
            </ul>
          </Card>
          <Card>
            <CardTitle>Claim Required</CardTitle>
            <p className="text-[#666] text-xs mb-3">Tweet verification code to claim the agent:</p>
            <p className="text-[#555] text-xs italic leading-relaxed">&quot;I&apos;m claiming my AI agent &apos;erel_evrnew&apos; on @moltbook Verification: swim-8NS3&quot;</p>
          </Card>
        </div>
      </section>

      {/* Email Routing */}
      <section>
        <SectionTitle>Email Inbox Routing</SectionTitle>
        <Card className="overflow-x-auto">
          <p className="text-[#666] text-xs mb-4">Gmail API daemon (<Code>erel_inbox_monitor.py</Code>) runs 24/7. Polls <Code>erel@evrnew.com</Code> every 5 minutes. Routes emails to agent inboxes as JSON.</p>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                {['Rule', 'Match', 'Routes To', 'Priority'].map(h => (
                  <th key={h} className="text-left text-[10px] tracking-widest uppercase text-[#444] pb-3 pr-4 border-b border-[#2a2a2a]">{h}</th>
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
                  <td className="py-2.5 pr-4 text-[#888]">{rule}</td>
                  <td className="py-2.5 pr-4"><Code>{match}</Code></td>
                  <td className="py-2.5 pr-4">{badge('blue', to as string)}</td>
                  <td className="py-2.5 text-[#555]">{priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      {/* MCP Servers */}
      <section>
        <SectionTitle>MCP Servers</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {mcpServers.map((mcp) => (
            <Card key={mcp.name}>
              <div className="mb-2">{badge('green', 'active')}</div>
              <CardTitle>{mcp.name}</CardTitle>
              <p className="text-[#555] text-xs">{mcp.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Integrations */}
      <section>
        <SectionTitle>Integrations &amp; API Status</SectionTitle>
        <Card className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                {['Integration', 'Purpose', 'Status'].map(h => (
                  <th key={h} className="text-left text-[10px] tracking-widest uppercase text-[#444] pb-3 pr-4 border-b border-[#2a2a2a]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {integrations.map((i) => (
                <tr key={i.name} className="border-b border-[#ffffff04] last:border-0">
                  <td className="py-2.5 pr-4 text-[#aaa]">{i.name}</td>
                  <td className="py-2.5 pr-4 text-[#555]">{i.purpose}</td>
                  <td className="py-2.5">
                    <span className={`text-xs font-medium ${i.status === 'active' ? 'text-[#22c55e]' : i.status === 'pending' ? 'text-[#facc15]' : 'text-[#ef4444]'}`}>
                      {i.status === 'active' ? '✓ Active' : i.status === 'pending' ? `⚠ ${i.note ?? 'Pending'}` : '✗ Error'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      {/* Infrastructure */}
      <section>
        <SectionTitle>Infrastructure &amp; Maintenance</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card>
            <CardTitle>System Services</CardTitle>
            <ul className="space-y-1 text-[#666] text-xs">
              <li className="before:content-['→_'] before:text-[#00e5ff]">Firewall: enabled</li>
              <li className="before:content-['→_'] before:text-[#00e5ff]">Sleep: disabled (SleepDisabled=1)</li>
              <li className="before:content-['→_'] before:text-[#00e5ff]">Auto-restart on power loss: on</li>
              <li className="before:content-['→_'] before:text-[#00e5ff]">Wake on LAN: on</li>
              <li className="before:content-['→_'] before:text-[#00e5ff]">Auto-login as <Code>erel</Code></li>
              <li className="before:content-['→_'] before:text-[#00e5ff]">Auto-updates: disabled</li>
            </ul>
          </Card>
          <Card>
            <CardTitle>Cron Schedule</CardTitle>
            <ul className="space-y-1 text-[#666] text-xs mb-4">
              <li className="before:content-['→_'] before:text-[#00e5ff]">Every 15 min: health check</li>
              <li className="before:content-['→_'] before:text-[#00e5ff]">Sunday 3am: log rotation</li>
              <li className="before:content-['→_'] before:text-[#00e5ff]">Sunday 4am: disk cleanup</li>
            </ul>
            <CardTitle>Log Files</CardTitle>
            <ul className="space-y-1 text-[#666] text-xs">
              <li className="before:content-['→_'] before:text-[#00e5ff]"><Code>logs/erel-inbox.log</Code></li>
              <li className="before:content-['→_'] before:text-[#00e5ff]"><Code>logs/health.log</Code></li>
              <li className="before:content-['→_'] before:text-[#00e5ff]"><Code>logs/erel-inbox-stderr.log</Code></li>
            </ul>
          </Card>
        </div>
      </section>

      {/* Project Structure */}
      <section>
        <SectionTitle>Project Structure</SectionTitle>
        <Card>
          <pre className="text-[11px] text-[#555] leading-relaxed overflow-x-auto whitespace-pre">
{`~/evrnew-marketing/
├── agents/
│   ├── email-inbox/
│   │   ├── erel_inbox_monitor.py   `}<span className="text-[#00e5ff]">← 24/7 Gmail daemon</span>{`
│   │   ├── gmail_auth.py           `}<span className="text-[#00e5ff]">← one-time OAuth setup</span>{`
│   │   └── erel_send.py
│   └── telegram-bot/
│       ├── bot.py                  `}<span className="text-[#00e5ff]">← Telegram bot (PTB polling)</span>{`
│       └── webhook.py
├── config/
│   ├── agents.yaml                 `}<span className="text-[#00e5ff]">← all 8 agent definitions</span>{`
│   ├── gmail/credentials.json
│   ├── mcp/claude-mcp-config.json  `}<span className="text-[#00e5ff]">← MCP server config</span>{`
│   └── prompts/base_system_prompt.txt
├── data/inbox/                     `}<span className="text-[#00e5ff]">← routed email JSON files</span>{`
├── logs/
├── scripts/
│   ├── moltbook_heartbeat.py       `}<span className="text-[#00e5ff]">← 30min heartbeat</span>{`
│   └── cron/{health-check,log-rotate,disk-cleanup,restart-services}.sh
└── sites/openclaw-site/            `}<span className="text-[#00e5ff]">← this Mission Control app</span>
          </pre>
        </Card>
      </section>

      {/* Tech Stack */}
      <section>
        <SectionTitle>Full Tech Stack</SectionTitle>
        <Card>
          <div className="flex flex-wrap gap-2">
            {[
              ['blue', 'Python 3.12'],
              ['blue', 'CrewAI 1.10.0'],
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
              ['yellow', 'Google Chrome + ext.'],
              ['red', 'macOS LaunchAgents'],
              ['red', 'launchd / cron'],
              ['red', 'Homebrew 5.0.16'],
            ].map(([color, label]) => (
              <span key={label}>{badge(color, label)}</span>
            ))}
          </div>
        </Card>
      </section>

      {/* Self-maintenance commands */}
      <section>
        <SectionTitle>Self-Maintenance Commands</SectionTitle>
        <Card>
          <ul className="space-y-1 text-xs">
            <li><Code>~/evrnew-marketing/scripts/cron/health-check.sh</Code> <span className="text-[#555]">— system health check</span></li>
            <li><Code>~/evrnew-marketing/scripts/cron/restart-services.sh [all|inbox|ollama|n8n]</Code></li>
            <li><Code>~/evrnew-marketing/scripts/cron/log-rotate.sh</Code></li>
            <li><Code>~/evrnew-marketing/scripts/cron/disk-cleanup.sh</Code></li>
            <li><Code>tail -f ~/evrnew-marketing/logs/health.log</Code></li>
          </ul>
        </Card>
      </section>

      <footer className="text-center text-[#333] text-[11px] pt-4 pb-8 border-t border-[#2a2a2a]">
        <span className="text-[#00e5ff]">EREL.AI</span> — Evrnew LLC Autonomous Marketing &amp; Operations Server &nbsp;|&nbsp; March 2026
      </footer>
    </div>
  )
}

// Local layout helpers (shared across overview sections)
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] tracking-[3px] uppercase text-[#00e5ff] mb-3 pb-2 border-b border-[#2a2a2a]">
      {children}
    </h2>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#161616] border border-[#2a2a2a] rounded-lg p-4 ${className}`}>
      {children}
    </div>
  )
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[13px] font-semibold text-[#e8e8e8] mb-2">{children}</h3>
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-white/5 text-[#00e5ff] text-[11px] px-1.5 py-0.5 rounded">
      {children}
    </code>
  )
}
