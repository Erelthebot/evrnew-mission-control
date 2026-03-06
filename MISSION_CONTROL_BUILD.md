# EVRNEW Mission Control — Build Instructions

You are building the EVRNEW Mission Control dashboard for EVRNEW LLC, an insulation contractor in the Pacific Northwest.

## AUDIT COMPLETE — WHAT EXISTS:
- Next.js 14 App Router, TypeScript, Tailwind CSS
- Dark mode: bg #0d0d0d, accent #00e5ff cyan, #7c3aed purple
- Font: monospace
- Netlify static export (next.config.js has `output: 'export'`)
- Sidebar at components/layout/Sidebar.tsx
- Layout at app/layout.tsx with header and mission statement
- Overview at app/page.tsx — PRESERVE THIS EXACTLY, DO NOT MODIFY
- lib/data/index.ts — 1168 lines of EVRNEW seed data with all types
- Route stubs exist but are mostly empty: tasks, calendar, memory, projects, documents, team, office, activity

## YOUR JOB: Build out every page with full content using the existing data.

## CRITICAL CONSTRAINTS:
1. Static export only — no server components with dynamic data, no API routes
2. NO Convex — use existing lib/data/index.ts mock data
3. All interactive pages must have 'use client' directive
4. Keep existing design: #0d0d0d, #00e5ff, #7c3aed, mono font
5. NEVER modify app/page.tsx or app/layout.tsx
6. After building all pages, run `npm run build` and fix all errors until build passes

## DESIGN SYSTEM:
Background: bg-[#0d0d0d] page, bg-[#111111] cards, border-[#2a2a2a] borders
Text: text-[#e8e8e8] primary, text-[#888888] secondary, text-[#444444] muted
Accents: text-[#00e5ff] cyan, text-[#a78bfa] purple, text-[#22c55e] green, text-[#facc15] yellow, text-[#ef4444] red, text-[#f97316] orange

Card: `<div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-4 hover:border-[#333333] transition-colors">`
Badge: `<span className="text-[10px] px-2 py-0.5 rounded border font-medium tracking-wide">`

## PAGES TO BUILD:

### 1. app/tasks/page.tsx — Kanban Task Board
- Import tasks from '@/lib/data'
- 4 columns: To Do, In Progress, Review, Done (filter tasks by status: todo/in_progress/review/done)
- Task cards: title, priority badge (critical=red, high=orange, medium=yellow, low=blue/gray), assignee, due date, tags, relatedAgent
- Column headers with task count
- Search input at top to filter by title/assignee
- Stats row: total tasks count, per-status counts
- State: use useState for search and active filter

### 2. app/calendar/page.tsx — Weekly Calendar
- Import calendarEvents from '@/lib/data'
- Weekly grid Mon-Sun, show current week
- Color-code by category: job=blue, estimate=cyan, sales=green, admin=gray, automation=purple, reminder=yellow
- Filter chips for category
- Event cards with title, time, category badge
- Today column highlighted

### 3. app/memory/page.tsx — Knowledge Vault
- Import memories from '@/lib/data'
- Search bar filtering title/summary/tags
- Category filter pills with count badges: All, Customers, Jobs, Sales, Operations, Team, Vendors, Automations, Finance
- Memory cards: title, summary (truncated), category badge, tags as chips, source, updatedAt
- Grid layout

### 4. app/projects/page.tsx — Projects Dashboard
- Import projects from '@/lib/data'
- Status filter: All, active, planning, blocked, completed
- Project cards: name, status badge, owner, priority badge, percentComplete progress bar, blockers list, nextActions list
- Stats bar: total, active, blocked

### 5. app/documents/page.tsx — Document Repository
- Import documents from '@/lib/data'
- Search bar
- Type filter tabs: All, estimate, sow, sop, proposal, invoice, contract, rebate, training, script, marketing
- Document rows: title, type badge, category, owner, updatedAt, tags
- Count per type in filter tabs

### 6. app/team/page.tsx — Team Directory
- Import teamMembers, systemAgents from '@/lib/data'
- Section 1: Human Team — cards: name, role, status dot (green=active, yellow=away, red=busy), workload bar, currentActivity
- Section 2: Operations AI Agents (type='ai' from teamMembers) — cards: name, role, status, currentTask, capabilities list
- Section 3: System Agents (systemAgents) — cards: role, llm, tools, schedule

### 7. app/office/page.tsx — Operations Room
- CSS-based 2D operations room layout
- Use a grid to place workstations
- Each human team member shown at their desk with emoji avatar and currentActivity
- Each AI agent shown as a glowing terminal node
- Activity ticker at the bottom showing recent actions scrolling
- Import teamMembers, systemAgents, activityLogs from '@/lib/data'
- Use inline styles or Tailwind for the pixel/retro aesthetic with glow effects
- box-shadow glow: `shadow-[0_0_10px_rgba(0,229,255,0.3)]` for cyan glow

### 8. app/activity/page.tsx — Activity Feed
- Import activityLogs from '@/lib/data'
- Reverse chronological (newest first — sort by timestamp desc)
- Each entry: timestamp (formatted), actor, action verb, target, category icon (emoji)
- Color-code by category
- Filter buttons: All, Tasks, Documents, Projects, Agents, System
- Show all entries (no pagination needed for static)

### 9. app/system/page.tsx — System Status (CREATE NEW)
- Import systemServices, integrations, mcpServers, cronJobs from '@/lib/data'
- Server identity card: Erel, Mac Mini M4 Pro, 12-core, 24GB, 1TB, erel.local
- Services health grid with status indicators
- Integrations status table
- MCP servers list
- Cron schedule table
- API keys status grid (show which are configured vs pending)

### 10. UPDATE components/layout/Sidebar.tsx
- Add System Status link { href: '/system', label: 'System Status', icon: '◉' } to the MAIN group
- Keep all other nav items exactly as they are

## AFTER BUILDING:
1. Run: npm run build
2. Fix ALL TypeScript errors and build errors
3. Run: npm run build again
4. Repeat until build exits with code 0 and 'out/' directory is populated
5. When build passes, run: openclaw system event --text "Done: EVRNEW Mission Control built — all pages complete, build passing" --mode now
