#!/usr/bin/env node
/**
 * Seed script for Supabase — EVRNEW Mission Control
 * Upserts all hardcoded data so it's idempotent.
 * Run: node scripts/seed-supabase.js
 */

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://xpaypfllvqedhgwxbmfx.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwYXlwZmxsdnFlZGhnd3hibWZ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzUxNzg3NCwiZXhwIjoyMDg5MDkzODc0fQ.qijfAIRd-MZCzowZXkZnJ_s95sNoSh_Armz9q0kr-7Y'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// ─────────────────────────────────────────────
// TASKS
// ─────────────────────────────────────────────
const tasks = [
  { id: 't1', title: 'Follow up: Martinez attic estimate', status: 'in_progress', priority: 'high', owner: 'Johnny', due: '2026-03-07', project: 'Sales Pipeline', notes: 'VM left, email sent, call Thu 10am' },
  { id: 't2', title: 'Submit PSE rebate — Johnson + Garcia', status: 'todo', priority: 'critical', owner: 'Diane', due: '2026-03-10', project: 'Rebate Fulfillment', notes: 'Deadline March 10 5pm' },
  { id: 't3', title: 'Post crawlspace lead installer job listing', status: 'todo', priority: 'high', owner: 'Misty', due: '2026-03-08', project: 'Hiring', notes: '' },
  { id: 't4', title: 'Build GHL automation: estimate follow-up 3-touch sequence', status: 'in_progress', priority: 'critical', owner: 'Erel', due: '2026-03-07', project: 'CRM System', notes: 'Day 1 email + Day 3 SMS + Day 7 last chance' },
  { id: 't5', title: 'Finalize attic installation SOP v3.0', status: 'in_progress', priority: 'high', owner: 'Documentation Agent', due: '2026-03-09', project: 'Operations Build-Out', notes: 'Adding blower door test section' },
  { id: 't6', title: 'Close Amazon HQ / Cascade Tech bid', status: 'todo', priority: 'critical', owner: 'Johnny', due: '2026-03-08', project: 'Sales Pipeline', notes: 'Competing with 2 bids, key differentiator: commercial insurance + crew size' },
  { id: 't7', title: 'Get QB API credentials from Diane', status: 'blocked', priority: 'high', owner: 'Diane', due: '2026-03-06', project: 'QuickBooks/Invoicing', notes: 'Blocking entire QB integration' },
  { id: 't8', title: 'Launch Bellevue spray foam landing page', status: 'todo', priority: 'high', owner: 'Marketing Agent', due: '2026-03-10', project: 'Marketing Automation', notes: 'Content written, needs CMS publish' },
  { id: 't9', title: 'Q1 Google Ads campaign review', status: 'in_progress', priority: 'high', owner: 'Ads Agent', due: '2026-03-08', project: 'Marketing Automation', notes: 'Paused 3 underperforming groups' },
  { id: 't10', title: 'Research WA contractor license for remediation work', status: 'todo', priority: 'medium', owner: 'Erel', due: '2026-03-15', project: 'Attic Remediation Services', notes: '' },
  { id: 't11', title: 'Get equipment pricing for crawlspace division', status: 'todo', priority: 'high', owner: 'Misty', due: '2026-03-10', project: 'Crawlspace Division Launch', notes: 'Dehumidifier supply deal needed' },
  { id: 't12', title: 'Train Johnny on new GHL pipeline stages', status: 'todo', priority: 'medium', owner: 'Erel', due: '2026-03-12', project: 'CRM System', notes: '' },
]

// ─────────────────────────────────────────────
// PROJECTS
// ─────────────────────────────────────────────
const projects = [
  { id: 'p1', name: 'EVRNEW Operations Build-Out', description: 'Systematize all field, admin, and sales operations into documented, repeatable workflows. SOPs for every role and process.', status: 'active', owner: 'Erel', priority: 'critical', blockers: [], next_actions: ['Finalize attic SOP v3.0', 'Create crawlspace field checklist', 'Document estimate-to-invoice flow'], percent_complete: 38, updated_at: '2026-03-05T09:00:00Z' },
  { id: 'p2', name: 'Insulation Sales Pipeline', description: 'Build and optimize the full B2C and B2B sales pipeline from lead capture to closed job, including scripts, follow-up, and CRM workflows.', status: 'active', owner: 'Johnny', priority: 'high', blockers: [], next_actions: ['Close Amazon HQ bid', 'Follow up Martinez estimate', 'Train on new GHL pipeline stages'], percent_complete: 55, updated_at: '2026-03-05T08:30:00Z' },
  { id: 'p3', name: 'Crawlspace Division Launch', description: 'Launch crawlspace encapsulation as a dedicated service line with its own crew, equipment, marketing, and pipeline.', status: 'active', owner: 'Erel', priority: 'high', blockers: ['Need dedicated lead installer hired first'], next_actions: ['Post job listings', 'Get equipment pricing from suppliers', 'Build dedicated landing page'], percent_complete: 20, updated_at: '2026-03-03T15:00:00Z' },
  { id: 'p4', name: 'Attic Remediation Services', description: 'Develop attic remediation (mold, rodent, air-sealing) as an upsell service bundled with insulation installs.', status: 'planning', owner: 'Clint', priority: 'medium', blockers: ['Need licensing research for remediation work in WA'], next_actions: ['Research WA state contractor license requirements', 'Get sub-contractor quotes for mold remediation'], percent_complete: 10, updated_at: '2026-02-20T11:00:00Z' },
  { id: 'p5', name: 'CRM / GoHighLevel System', description: 'Build out GHL as the central hub for all leads, pipelines, automations, reputation management, and communication.', status: 'active', owner: 'Erel', priority: 'critical', blockers: [], next_actions: ['Build estimate follow-up drip', 'Set up QuickBooks sync', 'Activate reputation management campaigns'], percent_complete: 60, updated_at: '2026-03-04T16:00:00Z' },
  { id: 'p6', name: 'Marketing Automation Pipeline', description: 'Run and optimize all digital marketing: Google Ads, Meta, SEO, content, social, email, and competitive intelligence.', status: 'active', owner: 'Marketing Agent', priority: 'high', blockers: [], next_actions: ['Q1 campaign review', 'Launch Bellevue spray foam landing page', 'Optimize Google Ads for Q2'], percent_complete: 65, updated_at: '2026-03-05T11:00:00Z' },
  { id: 'p7', name: 'Hiring / Staffing Build-Out', description: 'Build the team needed to scale: lead installer, additional field tech, admin support. Define roles, comp, and onboarding.', status: 'active', owner: 'Misty', priority: 'high', blockers: [], next_actions: ['Post crawlspace lead installer listing', 'Interview 3 candidates week of 3/12', 'Draft offer letter template'], percent_complete: 40, updated_at: '2026-03-05T09:00:00Z' },
  { id: 'p8', name: 'QuickBooks / Invoicing Workflow', description: 'Automate invoicing end-to-end: GHL won → QB invoice → payment tracking → follow-up.', status: 'blocked', owner: 'Diane', priority: 'high', blockers: ['GHL-QuickBooks API integration not yet configured', 'Need QuickBooks Online API credentials from Diane'], next_actions: ['Get QB API credentials from Diane', 'Test GHL-QB Zapier bridge', 'Set up payment reminder automations'], percent_complete: 15, updated_at: '2026-03-04T12:00:00Z' },
  { id: 'p9', name: 'Rebate Fulfillment System', description: 'Systematize energy rebate filing (PSE, Seattle City Light, Snohomish PUD) to capture rebates on every eligible job.', status: 'active', owner: 'Finance Agent', priority: 'medium', blockers: [], next_actions: ['Submit PSE forms for Johnson + Garcia', 'Build rebate tracking spreadsheet', 'Research Snohomish PUD program'], percent_complete: 30, updated_at: '2026-03-02T14:00:00Z' },
  { id: 'p10', name: 'Contents / Pack-Out Systems', description: 'Develop contents handling and pack-out as a restoration add-on service for water and smoke damage customers.', status: 'planning', owner: 'Erel', priority: 'low', blockers: ['Not yet resourced — future expansion'], next_actions: ['Research pack-out licensing and certifications', 'Survey existing restoration companies for partnership'], percent_complete: 5, updated_at: '2026-02-10T10:00:00Z' },
]

// ─────────────────────────────────────────────
// MEMORIES
// ─────────────────────────────────────────────
const memories = [
  { id: 'm1', title: 'Johnson Residence — Attic Blown-In Project', summary: 'Completed 2/28. R-49 blown-in, 2,400 sqft. PSE rebate submitted. Customer very happy — asked for referral card. Follow up in 6 months for crawlspace check.', category: 'Customers', tags: ['attic', 'blown-in', 'pse-rebate', 'kirkland'], related_project: 'p4', source: 'GoHighLevel CRM', updated_at: '2026-03-01T09:00:00Z' },
  { id: 'm2', title: 'PSE Rebate Process — Step-by-Step', summary: 'Puget Sound Energy rebate requires: (1) Pre-approval before job, (2) R-value verification form, (3) Utility bill showing address, (4) Invoice copy, (5) Submit within 60 days of completion. Typical payout: $400–$1,200.', category: 'Finance', tags: ['rebate', 'pse', 'process', 'compliance'], related_project: 'p9', source: 'Internal Documentation', updated_at: '2026-03-02T14:00:00Z' },
  { id: 'm3', title: 'Amazon HQ Renovation — Commercial Lead Details', summary: 'Contacted via web form 3/4. Decision maker: Facilities Manager, Brian Cole. 18,000 sqft open-cell. Timeline: Q2 start. Budget: flexible. Competing with 2 other bids. Key differentiator: our commercial insurance coverage and crew size.', category: 'Sales', tags: ['commercial', 'amazon', 'bellevue', 'spray-foam', 'high-value'], related_project: 'p2', source: 'GoHighLevel CRM', updated_at: '2026-03-05T09:45:00Z' },
  { id: 'm4', title: 'Spray Foam Pricing — King County 2026', summary: 'Current market rates: Open-cell $1.00–1.25/sqft at 3.5". Closed-cell $2.00–2.50/sqft at 2". EVRNEW margin target: 45% gross. Material cost: ~$0.55/sqft open-cell. Key cost driver: crew day rate $800/day (2-person team).', category: 'Finance', tags: ['pricing', 'spray-foam', 'king-county', 'margins'], related_project: 'p2', source: 'Internal Operations', updated_at: '2026-02-20T10:00:00Z' },
  { id: 'm5', title: 'Top Competitors — Insulation in Seattle MSA', summary: 'Main competitors: (1) RetroFoam of WA — strong on spray foam, $1.4M+ revenue. (2) Dr. Energy Saver — national franchise, high ad spend. (3) PNW Insulation — crawlspace specialists. Our edge: local, faster scheduling, AI-powered follow-up, competitive pricing.', category: 'Sales', tags: ['competitors', 'seattle', 'market-research'], related_project: 'p6', source: 'Competitive Intelligence Agent', updated_at: '2026-03-04T18:00:00Z' },
  { id: 'm6', title: 'GoHighLevel Pipeline Structure', summary: 'Stages: New Lead → Estimate Scheduled → Estimate Sent → Follow-Up → Won / Lost. Automations: immediate auto-reply SMS, 24hr follow-up email, 3-day call reminder. All reps must log notes after every touchpoint.', category: 'Operations', tags: ['ghl', 'crm', 'pipeline', 'automation'], related_project: 'p5', source: 'Internal Operations', updated_at: '2026-02-15T11:00:00Z' },
  { id: 'm7', title: 'Misty — Hiring Process Notes', summary: 'Current open roles: Lead Installer (crawlspace), Field Tech (general). Screening: 10-min phone → in-person demo day → background check. Offer process: verbal first, written within 48hrs. Indeed ads converting at ~$180/hire currently.', category: 'Team', tags: ['hiring', 'hr', 'staffing', 'misty'], related_project: 'p7', source: 'HR Operations', updated_at: '2026-03-03T15:00:00Z' },
  { id: 'm8', title: 'Vendor: Honeywell — Blown-In Insulation Supply', summary: 'Primary blown-in material supplier. Account #: HW-447821. Lead time: next day for < 200 bags, 2-day for bulk. Net 30 terms. Rep: Dave Whitman, 425-555-0198. Typical order: 40-80 bags per attic job.', category: 'Vendors', tags: ['vendor', 'blown-in', 'materials', 'supply-chain'], related_project: null, source: 'Operations', updated_at: '2026-01-10T09:00:00Z' },
  { id: 'm9', title: 'Email Drip — Unresponded Estimate Sequence', summary: 'Day 1: Warm check-in email + value prop. Day 3: SMS from Johnny personally. Day 7: Last chance + urgency (season/availability). Open rates: Day 1 = 68%, Day 3 SMS = 94%, Day 7 = 41%. Conversion from drip: ~22%.', category: 'Automations', tags: ['email', 'drip', 'ghl', 'automation', 'conversion'], related_project: 'p5', source: 'Email Drip Agent', updated_at: '2026-02-28T12:00:00Z' },
  { id: 'm10', title: 'Crawlspace Division — Launch Checklist', summary: 'To launch as standalone service line: (1) Hire dedicated lead installer, (2) Acquire encapsulation equipment (dehumidifier supply deal), (3) Build dedicated landing page, (4) Set up GHL pipeline variant, (5) Train sales scripts. Target: 8 jobs/month by Q3.', category: 'Operations', tags: ['crawlspace', 'division', 'launch', 'planning'], related_project: 'p3', source: 'Internal Planning', updated_at: '2026-03-01T16:00:00Z' },
]

// ─────────────────────────────────────────────
// TEAM MEMBERS
// ─────────────────────────────────────────────
const teamMembers = [
  { id: 'tm1', name: 'Johnny', role: 'Sales Lead', type: 'human', avatar: 'JN', responsibilities: ['Lead qualification', 'On-site estimates', 'Sales calls', 'Customer relationship management', 'Pipeline management in GHL'], status: 'active', current_activity: 'Following up on Martinez attic estimate', workload: 'heavy' },
  { id: 'tm2', name: 'Misty', role: 'Operations & HR Manager', type: 'human', avatar: 'MS', responsibilities: ['Scheduling crew', 'Hiring & onboarding', 'HR compliance', 'Operations coordination', 'Vendor relations'], status: 'active', current_activity: 'Reviewing lead installer applicants', workload: 'heavy' },
  { id: 'tm3', name: 'Clint', role: 'Lead Field Technician', type: 'human', avatar: 'CL', responsibilities: ['Attic insulation installs', 'Spray foam application', 'Crew supervision', 'Quality control', 'Equipment maintenance'], status: 'active', current_activity: 'Attic install — Kirkland job site', workload: 'heavy' },
  { id: 'tm4', name: 'Diane', role: 'Finance & Admin', type: 'human', avatar: 'DN', responsibilities: ['Invoicing & QuickBooks', 'Rebate filings', 'Payroll coordination', 'Accounts receivable', 'Admin support'], status: 'active', current_activity: 'Processing Marysville job invoice', workload: 'normal' },
  { id: 'tm5', name: 'AJ', role: 'Field Technician', type: 'human', avatar: 'AJ', responsibilities: ['Insulation installation', 'Crawlspace work', 'Site prep & cleanup', 'Material handling'], status: 'active', current_activity: 'On-site — Kirkland attic job', workload: 'heavy' },
  { id: 'tm6', name: 'Ana', role: 'Field Technician', type: 'human', avatar: 'AN', responsibilities: ['Insulation installation', 'Attic prep', 'Air sealing', 'Site photography & documentation'], status: 'away', current_activity: 'Day off', workload: 'light' },
  { id: 'tm7', name: 'Oscar', role: 'Field Technician', type: 'human', avatar: 'OS', responsibilities: ['Insulation installation', 'Warranty follow-ups', 'Material delivery runs', 'Job site setup'], status: 'active', current_activity: 'Warranty inspection runs — Everett cluster', workload: 'normal' },
  { id: 'tm8', name: 'Erel', role: 'Chief of Staff AI', type: 'ai', avatar: 'ER', responsibilities: ['System orchestration', 'Strategy & decisions', 'Project coordination', 'Agent management', 'Internal comms & reporting'], status: 'active', current_activity: 'Building Mission Control app', workload: 'heavy', model: 'Claude Sonnet 4.6', tools: ['All MCP servers', 'Claude Code', 'Convex', 'Netlify'] },
  { id: 'tm9', name: 'Sales Agent', role: 'AI Sales Coordinator', type: 'ai', avatar: 'SA', responsibilities: ['Lead qualification automation', 'GHL pipeline management', 'Estimate follow-up triggers', 'Win/loss analysis'], status: 'active', current_activity: 'Monitoring estimate follow-up queue', workload: 'normal', model: 'Claude Sonnet', tools: ['GoHighLevel API', 'Gmail API', 'Memory MCP'] },
  { id: 'tm10', name: 'Operations Agent', role: 'AI Operations Coordinator', type: 'ai', avatar: 'OA', responsibilities: ['SOP maintenance', 'Workflow optimization', 'Job scheduling support', 'Field team coordination'], status: 'active', current_activity: 'Updating attic installation SOP v3.0', workload: 'normal', model: 'Claude Sonnet', tools: ['Filesystem MCP', 'Memory MCP', 'Sequential Thinking'] },
  { id: 'tm11', name: 'Finance Agent', role: 'AI Finance Coordinator', type: 'ai', avatar: 'FA', responsibilities: ['Rebate tracking', 'Invoice generation support', 'QuickBooks sync monitoring', 'Financial reporting'], status: 'active', current_activity: 'Preparing PSE rebate submission packet', workload: 'normal', model: 'Claude Sonnet', tools: ['QuickBooks API', 'GoHighLevel', 'Filesystem MCP'] },
  { id: 'tm12', name: 'Marketing Agent', role: 'AI Marketing Coordinator', type: 'ai', avatar: 'MA', responsibilities: ['Campaign performance monitoring', 'Content creation', 'Landing page optimization', 'SEO recommendations'], status: 'busy', current_activity: 'Writing Bellevue spray foam landing page copy', workload: 'heavy', model: 'Claude Sonnet', tools: ['DataForSEO', 'BrowserBase', 'Buffer API', 'GHL'] },
  { id: 'tm13', name: 'Scheduling Agent', role: 'AI Scheduling Coordinator', type: 'ai', avatar: 'SC', responsibilities: ['Job scheduling optimization', 'Crew availability tracking', 'Calendar management', 'Reminder automation'], status: 'active', current_activity: 'Checking crew availability for Kirkland crawlspace', workload: 'light', model: 'Grok Fast', tools: ['GHL API', 'Gmail API', 'Memory MCP'] },
  { id: 'tm14', name: 'HR Agent', role: 'AI Recruiting Coordinator', type: 'ai', avatar: 'HA', responsibilities: ['Job posting management', 'Applicant screening', 'Interview scheduling', 'Onboarding task automation'], status: 'active', current_activity: 'Drafting lead installer job description', workload: 'normal', model: 'Claude Sonnet', tools: ['Indeed API', 'Gmail API', 'Memory MCP'] },
  { id: 'tm15', name: 'Documentation Agent', role: 'AI SOP & Docs Coordinator', type: 'ai', avatar: 'DA', responsibilities: ['SOP writing & updating', 'Process documentation', 'Training materials', 'Knowledge base management'], status: 'busy', current_activity: 'Writing Attic Installation SOP v3.0', workload: 'heavy', model: 'Claude Sonnet', tools: ['Filesystem MCP', 'Memory MCP', 'Sequential Thinking'] },
]

// ─────────────────────────────────────────────
// CALENDAR EVENTS
// ─────────────────────────────────────────────
const calendarEvents = [
  { id: 'e1', title: 'Attic blown-in install — Kirkland, WA', date: '2026-03-05', time: '08:00', duration: 360, category: 'job', status: 'confirmed', description: 'Residential attic: 2,200 sqft, R-49 blown-in. Crew: Clint + AJ.', location: '412 Lakeview Dr, Kirkland WA', assignee: 'Clint' },
  { id: 'e2', title: 'Crawlspace estimate — Marysville', date: '2026-03-06', time: '10:00', duration: 90, category: 'estimate', status: 'scheduled', description: 'Thompson residence. Suspected moisture, existing vapor barrier failure.', location: '2847 88th St NE, Marysville WA', assignee: 'Johnny' },
  { id: 'e3', title: 'Commercial spray foam bid — Everett office park', date: '2026-03-06', time: '14:00', duration: 120, category: 'estimate', status: 'scheduled', description: 'Cascade Tech HQ. Open-cell spray foam, 18,000 sqft.', location: '1800 Everett Mall Way, Everett WA', assignee: 'Johnny' },
  { id: 'e4', title: 'Customer follow-up — Johnson attic rebate', date: '2026-03-07', time: '09:00', duration: 30, category: 'sales', status: 'scheduled', description: 'Confirm PSE rebate check received. Ask for Google review.', assignee: 'Johnny' },
  { id: 'e5', title: 'GHL automation setup — estimate follow-up sequence', date: '2026-03-07', time: '13:00', duration: 180, category: 'automation', status: 'scheduled', description: 'Build 3-touch email+SMS drip in GoHighLevel for unresponded estimates.', assignee: 'Erel' },
  { id: 'e6', title: 'Payroll processing — bi-weekly', date: '2026-03-07', time: '12:00', duration: 60, category: 'admin', status: 'scheduled', description: 'Process payroll for Clint, AJ, Ana, Oscar. Submit via Gusto.', assignee: 'Diane' },
  { id: 'e7', title: 'Spray foam install — commercial job, Arlington', date: '2026-03-09', time: '07:00', duration: 480, category: 'job', status: 'confirmed', description: 'New construction warehouse. Closed-cell foam, roof deck and walls.', location: '7432 Division St, Arlington WA', assignee: 'Clint' },
  { id: 'e8', title: 'PSE rebate submission deadline', date: '2026-03-10', time: '17:00', duration: 0, category: 'reminder', status: 'scheduled', description: 'Johnson + Garcia rebate paperwork must be submitted by 5pm.', assignee: 'Diane' },
  { id: 'e9', title: 'Crawlspace encapsulation — Bellevue', date: '2026-03-11', time: '08:00', duration: 480, category: 'job', status: 'confirmed', description: '1,800 sqft. Full vapor barrier, insulation, and dehumidifier install.', location: '8934 156th Ave SE, Bellevue WA', assignee: 'AJ' },
  { id: 'e10', title: 'Hiring: Lead Installer interviews', date: '2026-03-12', time: '10:00', duration: 180, category: 'admin', status: 'scheduled', description: '3 candidates for crawlspace division lead role.', assignee: 'Misty' },
  { id: 'e11', title: 'Cron: health-check.sh', date: '2026-03-05', time: '00:00', duration: 5, category: 'automation', status: 'confirmed', description: 'Automated system health check. Runs every 15 minutes via launchd.', assignee: 'Erel' },
  { id: 'e12', title: 'Weekly attic inspection — Everett cluster', date: '2026-03-13', time: '09:00', duration: 240, category: 'job', status: 'scheduled', description: '4 warranty follow-ups in Everett cluster. Oscar driving.', location: 'Everett, WA', assignee: 'Oscar' },
]

// ─────────────────────────────────────────────
// DOCUMENTS
// ─────────────────────────────────────────────
const documents = [
  { id: 'd1', title: 'Attic Insulation Estimate — Martinez Residence', type: 'estimate', category: 'Estimates', tags: ['attic', 'blown-in', 'seattle', 'estimate'], related_project: 'p2', created_at: '2026-03-02T10:00:00Z', updated_at: '2026-03-02T10:00:00Z', owner: 'Johnny', preview: 'Estimate for 2,100 sqft attic blown-in insulation at R-49. Total: $3,200. Includes air sealing at ceiling penetrations.' },
  { id: 'd2', title: 'Crawlspace Encapsulation SOW — Kirkland', type: 'sow', category: 'Scopes of Work', tags: ['crawlspace', 'sow', 'kirkland', 'encapsulation'], related_project: 'p3', created_at: '2026-03-01T14:00:00Z', updated_at: '2026-03-01T14:00:00Z', owner: 'Erel', preview: 'Full encapsulation: vapor barrier install (20-mil), insulation on walls, conditioned air source, and dehumidifier. 1,800 sqft crawl.' },
  { id: 'd3', title: 'Field Technician SOP — Attic Installation v2.1', type: 'sop', category: 'SOPs', tags: ['sop', 'field', 'attic', 'installation', 'training'], related_project: 'p1', created_at: '2026-01-15T09:00:00Z', updated_at: '2026-02-20T11:00:00Z', owner: 'Erel', preview: 'Step-by-step guide for attic blown-in jobs. Includes setup, blower calibration, coverage verification, photo checklist, and cleanup.' },
  { id: 'd4', title: 'Commercial Spray Foam Proposal — Cascade Tech', type: 'proposal', category: 'Proposals', tags: ['commercial', 'spray-foam', 'everett', 'proposal'], related_project: 'p2', created_at: '2026-03-04T16:00:00Z', updated_at: '2026-03-05T09:45:00Z', owner: 'Erel', preview: 'Open-cell spray foam proposal for 18,000 sqft commercial renovation. Scope, timeline, warranty, and references included.' },
  { id: 'd5', title: 'PSE Energy Rebate Packet — Johnson Residence', type: 'rebate', category: 'Rebate Paperwork', tags: ['rebate', 'pse', 'johnson', 'attic'], related_project: 'p9', created_at: '2026-03-03T10:00:00Z', updated_at: '2026-03-03T10:00:00Z', owner: 'Diane', preview: 'Complete PSE rebate submission packet: pre-approval confirmation, R-value cert, utility address verification, and invoice copy.' },
  { id: 'd6', title: 'Lead Installer Interview Script — Crawlspace Division', type: 'script', category: 'Scripts', tags: ['hiring', 'interview', 'script', 'crawlspace'], related_project: 'p7', created_at: '2026-03-04T13:00:00Z', updated_at: '2026-03-04T13:00:00Z', owner: 'Misty', preview: 'Structured interview guide for lead installer role. Sections: experience questions, scenario challenges, skills demo, compensation discussion.' },
  { id: 'd7', title: 'Q1 2026 Marketing Performance Report', type: 'marketing', category: 'Marketing Assets', tags: ['marketing', 'q1', 'report', 'analytics', 'google-ads'], related_project: 'p6', created_at: '2026-03-04T15:00:00Z', updated_at: '2026-03-05T11:00:00Z', owner: 'Marketing Agent', preview: 'Q1 summary: 847 leads, $18,420 ad spend, 4.1% conversion rate. Top performers: attic insulation + spray foam campaigns in Bellevue.' },
  { id: 'd8', title: 'GHL CRM Automation Map v1.0', type: 'sop', category: 'SOPs', tags: ['ghl', 'automation', 'crm', 'diagram'], related_project: 'p5', created_at: '2026-02-25T10:00:00Z', updated_at: '2026-03-01T09:00:00Z', owner: 'Erel', preview: 'Full automation workflow map for GoHighLevel: lead entry, pipeline stages, triggers, SMS/email sequences, and won/lost outcomes.' },
  { id: 'd9', title: 'Sales Call Script — Residential Insulation', type: 'script', category: 'Scripts', tags: ['sales', 'script', 'residential', 'phone'], related_project: 'p2', created_at: '2026-02-10T09:00:00Z', updated_at: '2026-02-15T14:00:00Z', owner: 'Johnny', preview: 'Inbound call script covering: needs assessment, key qualifying questions, value delivery, and booking the estimate.' },
  { id: 'd10', title: 'Crawlspace Division Landing Page Copy', type: 'marketing', category: 'Marketing Assets', tags: ['crawlspace', 'landing-page', 'seo', 'copy'], related_project: 'p3', created_at: '2026-03-05T11:00:00Z', updated_at: '2026-03-05T11:00:00Z', owner: 'Marketing Agent', preview: 'SEO-optimized copy for crawlspace encapsulation service page targeting "crawl space insulation Seattle WA". E-E-A-T compliant.' },
]

// ─────────────────────────────────────────────
// ACTIVITY LOGS
// ─────────────────────────────────────────────
const activityLogs = [
  { id: 'a1', timestamp: '2026-03-05T11:42:00Z', action: 'Task created', category: 'task', actor: 'Erel', details: 'Created: "Build GHL automation: estimate follow-up 3-touch sequence"', related_id: 't6' },
  { id: 'a2', timestamp: '2026-03-05T11:00:00Z', action: 'Document generated', category: 'document', actor: 'Marketing Agent', details: 'Generated: "Crawlspace Division Landing Page Copy" (1,840 words)', related_id: 'd10' },
  { id: 'a3', timestamp: '2026-03-05T10:30:00Z', action: 'Task updated', category: 'task', actor: 'Ads Agent', details: 'Moved "Google Ads optimization Q2" to In Progress. Paused 3 underperforming ad groups.', related_id: 't11' },
  { id: 'a4', timestamp: '2026-03-05T10:00:00Z', action: 'Task updated', category: 'task', actor: 'Documentation Agent', details: 'Updated attic SOP v3.0 — added blower door test section (draft).', related_id: 't5' },
  { id: 'a5', timestamp: '2026-03-05T09:45:00Z', action: 'Memory saved', category: 'memory', actor: 'Erel', details: 'Updated memory: "Amazon HQ Renovation — Commercial Lead Details"', related_id: 'm3' },
  { id: 'a6', timestamp: '2026-03-05T09:15:00Z', action: 'Agent activity', category: 'agent', actor: 'competitive_intelligence', details: 'Completed weekly competitor monitoring scan. 2 new competitor Google Ads detected.', related_id: 'sa1' },
  { id: 'a7', timestamp: '2026-03-05T08:30:00Z', action: 'Task updated', category: 'task', actor: 'Johnny', details: 'Left note on Martinez follow-up: "VM left, email sent, will call again Thursday 10am"', related_id: 't1' },
  { id: 'a8', timestamp: '2026-03-05T08:00:00Z', action: 'System check', category: 'system', actor: 'Erel', details: 'Cron health check passed. All services nominal. Disk: 11GB/926GB used.' },
  { id: 'a9', timestamp: '2026-03-05T07:30:00Z', action: 'Email routed', category: 'automation', actor: 'erel_inbox_monitor', details: 'Google Alert routed to competitive_intelligence inbox: "spray foam insulation Seattle competitor"' },
  { id: 'a10', timestamp: '2026-03-04T18:00:00Z', action: 'Document generated', category: 'document', actor: 'Competitive Intel Agent', details: 'Generated Q1 competitor analysis report — 5 competitors profiled.', related_id: 'd7' },
  { id: 'a11', timestamp: '2026-03-04T16:00:00Z', action: 'Document created', category: 'document', actor: 'Erel', details: 'Created: "Commercial Spray Foam Proposal — Cascade Tech" for Amazon HQ bid.', related_id: 'd4' },
  { id: 'a12', timestamp: '2026-03-04T15:00:00Z', action: 'Task created', category: 'task', actor: 'Diane', details: 'Created: "Set up QuickBooks + GHL invoice sync" — blocked on API credentials.', related_id: 't14' },
  { id: 'a13', timestamp: '2026-03-04T14:30:00Z', action: 'Task moved to Review', category: 'task', actor: 'Marketing Agent', details: 'Q1 marketing report moved to Review. 847 leads, $18.4k spend, 4.1% CVR.', related_id: 't7' },
  { id: 'a14', timestamp: '2026-03-04T13:00:00Z', action: 'Document created', category: 'document', actor: 'Misty', details: 'Created: "Lead Installer Interview Script" for crawlspace division hiring.', related_id: 'd6' },
  { id: 'a15', timestamp: '2026-03-04T12:00:00Z', action: 'Project updated', category: 'project', actor: 'Diane', details: 'QuickBooks/Invoicing project marked BLOCKED — waiting on API credentials.', related_id: 'p8' },
  { id: 'a16', timestamp: '2026-03-03T15:00:00Z', action: 'Memory saved', category: 'memory', actor: 'Misty', details: 'Updated hiring process notes — Indeed ads at $180/hire, 3 candidates for crawler role.', related_id: 'm7' },
  { id: 'a17', timestamp: '2026-03-03T10:00:00Z', action: 'Document created', category: 'document', actor: 'Diane', details: 'Created PSE rebate packet for Johnson residence.', related_id: 'd5' },
  { id: 'a18', timestamp: '2026-03-02T14:00:00Z', action: 'Memory saved', category: 'memory', actor: 'Finance Agent', details: 'PSE rebate process documentation updated with new 60-day deadline rule.', related_id: 'm2' },
  { id: 'a19', timestamp: '2026-03-01T17:00:00Z', action: 'Task completed', category: 'task', actor: 'Technical SEO Agent', details: 'Completed evrnew.com technical SEO audit. LCP improved from 3.2s to 1.8s.', related_id: 't12' },
  { id: 'a20', timestamp: '2026-02-28T16:00:00Z', action: 'Task completed', category: 'task', actor: 'Misty', details: 'Oscar onboarding complete — I-9 done, safety training passed, tools checked out.', related_id: 't13' },
  { id: 'a21', timestamp: '2026-02-28T12:00:00Z', action: 'Automation triggered', category: 'automation', actor: 'email_drip', details: 'Day-7 last-chance email sent to 4 unresponded estimates. 1 booking response received.' },
  { id: 'a22', timestamp: '2026-02-28T09:00:00Z', action: 'Agent activity', category: 'agent', actor: 'Moltbook heartbeat', details: 'erel_evrnew presence heartbeat sent to Moltbook network. Uptime: 99.8%.' },
]

async function upsert(table, rows, label) {
  console.log(`Seeding ${label} (${rows.length} rows)...`)
  const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' })
  if (error) {
    console.error(`  ERROR seeding ${label}:`, error.message)
  } else {
    console.log(`  OK: ${rows.length} rows upserted to ${table}`)
  }
}

async function main() {
  console.log('=== EVRNEW Mission Control — Supabase Seed ===\n')

  await upsert('tasks', tasks, 'tasks')
  await upsert('projects', projects, 'projects')
  await upsert('memories', memories, 'memories')
  await upsert('team_members', teamMembers, 'team_members')
  await upsert('calendar_events', calendarEvents, 'calendar_events')
  await upsert('documents', documents, 'documents')
  await upsert('activity_logs', activityLogs, 'activity_logs')

  console.log('\n=== Seed complete ===')
}

main().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
