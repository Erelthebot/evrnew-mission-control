# Build: Agent Operations Page

Create a dedicated agent operations page at app/operations/page.tsx.
This page is ONLY about the 8 EVRNEW system agents — their status, schedules, outputs, and controls.

## Route: /operations

## Add to Sidebar (components/layout/Sidebar.tsx):
Add `{ href: '/operations', label: 'Operations', icon: '⬡' }` to the OPERATIONS group, FIRST item.
Keep all other nav items exactly as they are.

## Page Design

Dark mode, same design system as rest of app:
- bg-[#0d0d0d] page, bg-[#111111] cards, border-[#2a2a2a] borders
- text-[#e8e8e8] primary, text-[#888888] secondary
- text-[#00e5ff] cyan accent, text-[#a78bfa] purple, text-[#22c55e] green

'use client' directive required.

## Page Layout:

### TOP HEADER BAR (full width, below app header)
- Title: "Agent Fleet" in #00e5ff small caps tracking-widest
- Subtitle: "8 autonomous marketing agents running on erel.local"
- Right side: Fleet status pill "8/8 ONLINE" in green, pulsing dot

### FLEET STATS ROW (4 stat cards)
- Total Agents: 8
- Active Now: calculated from agent statuses  
- Runs Today: sum of agents that ran today
- Outputs Generated: total count of output files (can be static number like 47)

### AGENT GRID (2-column on large screens, 1-column on mobile)

Each agent gets a full card. Cards use bg-[#111111] border border-[#2a2a2a] rounded-xl.

Card anatomy (top to bottom):
1. CARD HEADER ROW:
   - Left: Agent number badge (#1-#8) in purple, Agent role name in white bold, plist label in #444 tiny
   - Right: Status badge (ACTIVE in green with pulsing dot, IDLE in yellow, ERROR in red)

2. DESCRIPTION: One-line description in #888

3. DIVIDER: border-[#1a1a1a]

4. METRICS ROW (3 mini stats in a row):
   - Schedule (clock icon emoji ⏰ + schedule string)
   - LLM (brain emoji 🧠 + model short name like "claude-haiku")
   - Last Run (checkmark ✓ + relative time like "6h ago" or "today 6am")

5. TOOLS ROW: 
   - Label "Tools:" in #444
   - Tool chips: each tool as a tiny pill bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] text-[10px] px-2 py-0.5 rounded

6. OUTPUT DIR:
   - Label "Output:" in #444 text-[10px]
   - Path in #555 font-mono text-[10px]

7. CARD FOOTER ROW (bg-[#0f0f0f] rounded-b-xl px-4 py-2.5 border-t border-[#1a1a1a]):
   - Left: "LaunchAgent" label + plist name in cyan monospace text-[10px]
   - Right: "Run Now ▶" button (text-[10px] text-[#00e5ff] border border-[#00e5ff]/30 px-3 py-1 rounded hover:bg-[#00e5ff]/10 transition-colors) — onClick just shows an alert "Agent queued: [name]" for now

### AGENT LOG SECTION (below the grid)

Title: "Recent Agent Activity" in #00e5ff small caps

Show a terminal-style log panel:
- bg-[#080808] border border-[#1a1a1a] rounded-xl p-4 font-mono text-[11px]
- Each log line: [timestamp] [AGENT_NAME] message
- Show 15-20 realistic sample log lines like:
  [06:00:02] [competitive] Starting SERP crawl for 20 target cities...
  [06:00:18] [competitive] Fetched 40 SERP pages — Attic Projects found in 12 results
  [06:00:31] [competitive] Saved intel to data/competitors/2026-03-05.md
  [06:00:31] [competitive] ✓ Run complete in 29s — Telegram notified
  [07:00:01] [content] Generating landing pages for 5 target cities...
  [07:00:44] [content] ✓ 5 landing pages written — saved to data/content/
  [08:00:00] [social] Generating daily posts for Facebook, Instagram, GBP...
  [08:00:38] [social] ✓ 9 posts generated (3 per platform) — saved to data/social/
  [14:00:00] [ads] Generating ad copy batch — 4 ad groups × 3 variants...
  [14:01:12] [ads] ✓ 12 ad variants written — saved to data/ads/
  
Color the agent names:
- [competitive] = text-[#00e5ff]
- [content] = text-[#a78bfa]
- [social] = text-[#22c55e]
- [ads] = text-[#facc15]
- [blog-seo] = text-[#f97316]
- [strategy] = text-[#06b6d4]
- [technical-seo] = text-[#8b5cf6]
- [email-drip] = text-[#ec4899]
- Timestamps = text-[#333]
- Messages = text-[#666]
- ✓ lines = text-[#22c55e]

### DATA TO USE (hardcode from the 8 real agents):

```
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
  },
]
```

## AFTER BUILDING:

1. Run: npm run build
2. Fix all TypeScript errors until build passes
3. Deploy: npx netlify-cli deploy --prod --dir=out --site fbdb76d0-6931-4a88-aa73-55284eeaef00
4. When deployed successfully, run: openclaw system event --text "Done: Operations page live at /operations on Netlify" --mode now
