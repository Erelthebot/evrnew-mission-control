// EVRNEW Mission Control — Mock Data Layer
// Structured to be swapped with Convex real-time backend.
// Each export mirrors the expected Convex table shape.

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done'
export type Priority = 'critical' | 'high' | 'medium' | 'low'
export type EventCategory = 'job' | 'estimate' | 'sales' | 'admin' | 'automation' | 'reminder'
export type MemoryCategory = 'Customers' | 'Jobs' | 'Sales' | 'Operations' | 'Team' | 'Vendors' | 'Automations' | 'Finance'
export type ProjectStatus = 'active' | 'planning' | 'blocked' | 'completed'
export type DocType = 'estimate' | 'sow' | 'sop' | 'proposal' | 'invoice' | 'contract' | 'rebate' | 'training' | 'script' | 'marketing'
export type MemberType = 'human' | 'ai'
export type MemberStatus = 'active' | 'away' | 'busy'
export type WorkloadLevel = 'light' | 'normal' | 'heavy'
export type ServiceHealth = 'online' | 'degraded' | 'offline' | 'pending'

export interface Task {
  id: string
  title: string
  description: string
  assignee: string
  priority: Priority
  dueDate: string
  projectId: string
  tags: string[]
  status: TaskStatus
  createdBy: string
  relatedAgent: string | null
  updatedAt: string
}

export interface CalendarEvent {
  id: string
  title: string
  date: string
  time: string
  duration: number
  category: EventCategory
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
  description: string
  location?: string
  assignee?: string
}

export interface Memory {
  id: string
  title: string
  summary: string
  category: MemoryCategory
  tags: string[]
  relatedProject: string | null
  source: string
  updatedAt: string
}

export interface Project {
  id: string
  name: string
  description: string
  status: ProjectStatus
  owner: string
  priority: Priority
  blockers: string[]
  nextActions: string[]
  percentComplete: number
  updatedAt: string
}

export interface Document {
  id: string
  title: string
  type: DocType
  category: string
  tags: string[]
  relatedProject: string | null
  createdAt: string
  updatedAt: string
  owner: string
  preview: string
}

export interface TeamMember {
  id: string
  name: string
  role: string
  type: MemberType
  avatar: string
  responsibilities: string[]
  status: MemberStatus
  currentActivity: string
  workload: WorkloadLevel
  model?: string
  tools?: string[]
}

export interface ActivityLog {
  id: string
  timestamp: string
  action: string
  category: 'task' | 'document' | 'memory' | 'project' | 'event' | 'automation' | 'agent' | 'system'
  actor: string
  details: string
  relatedId?: string
}

export interface SystemService {
  id: string
  name: string
  description: string
  status: ServiceHealth
  lastChecked: string
  uptime?: string
  endpoint?: string
}

export interface Integration {
  name: string
  purpose: string
  status: 'active' | 'pending' | 'error'
  note?: string
}

export interface CronJob {
  name: string
  schedule: string
  lastRun: string
  nextRun: string
  status: 'ok' | 'warning' | 'error'
}

// ─────────────────────────────────────────────
// TASKS — Seed Data
// ─────────────────────────────────────────────

export const tasks: Task[] = [
  {
    id: 't1',
    title: 'Follow up on attic insulation quote — Martinez Residence, Seattle',
    description: 'Sent quote 3 days ago. No response. Call + email follow-up sequence.',
    assignee: 'Johnny',
    priority: 'high',
    dueDate: '2026-03-06',
    projectId: 'p2',
    tags: ['sales', 'attic', 'seattle'],
    status: 'in_progress',
    createdBy: 'Erel',
    relatedAgent: 'email_drip',
    updatedAt: '2026-03-05T08:30:00Z',
  },
  {
    id: 't2',
    title: 'Schedule crawlspace encapsulation install — Kirkland',
    description: 'Customer confirmed. Need to book Clint + AJ for 2-day job.',
    assignee: 'Scheduling Agent',
    priority: 'high',
    dueDate: '2026-03-07',
    projectId: 'p3',
    tags: ['scheduling', 'crawlspace', 'kirkland'],
    status: 'todo',
    createdBy: 'Misty',
    relatedAgent: null,
    updatedAt: '2026-03-05T07:15:00Z',
  },
  {
    id: 't3',
    title: 'Commercial spray foam bid — Amazon HQ Renovation, Bellevue',
    description: 'Large commercial opportunity. Scope: 18,000 sqft open-cell. Need detailed estimate + proposal.',
    assignee: 'Erel',
    priority: 'critical',
    dueDate: '2026-03-08',
    projectId: 'p2',
    tags: ['commercial', 'spray-foam', 'bellevue', 'high-value'],
    status: 'review',
    createdBy: 'Johnny',
    relatedAgent: 'strategy',
    updatedAt: '2026-03-05T09:45:00Z',
  },
  {
    id: 't4',
    title: 'Submit PSE rebate paperwork — Johnson attic job',
    description: 'Puget Sound Energy rebate for blown-in attic. Forms signed. Submit to PSE portal.',
    assignee: 'Finance Agent',
    priority: 'high',
    dueDate: '2026-03-10',
    projectId: 'p9',
    tags: ['rebate', 'pse', 'paperwork', 'finance'],
    status: 'todo',
    createdBy: 'Diane',
    relatedAgent: null,
    updatedAt: '2026-03-04T16:00:00Z',
  },
  {
    id: 't5',
    title: 'Write SOP: Attic Insulation Installation Workflow v3.0',
    description: 'Update field SOP to include new blower door test requirements and photo checklist.',
    assignee: 'Documentation Agent',
    priority: 'medium',
    dueDate: '2026-03-12',
    projectId: 'p1',
    tags: ['sop', 'documentation', 'attic'],
    status: 'in_progress',
    createdBy: 'Erel',
    relatedAgent: null,
    updatedAt: '2026-03-05T10:00:00Z',
  },
  {
    id: 't6',
    title: 'Build GHL automation: estimate follow-up 3-touch sequence',
    description: 'Create email + SMS drip for unresponded estimates: Day 1, Day 3, Day 7.',
    assignee: 'Erel',
    priority: 'high',
    dueDate: '2026-03-09',
    projectId: 'p5',
    tags: ['ghl', 'automation', 'crm', 'email'],
    status: 'todo',
    createdBy: 'Erel',
    relatedAgent: 'email_drip',
    updatedAt: '2026-03-05T08:00:00Z',
  },
  {
    id: 't7',
    title: 'Q1 marketing campaign performance review',
    description: 'Analyze Google Ads, Meta, and SEO performance Jan–Mar. Recommend Q2 budget shifts.',
    assignee: 'Marketing Agent',
    priority: 'medium',
    dueDate: '2026-03-15',
    projectId: 'p6',
    tags: ['marketing', 'analytics', 'reporting'],
    status: 'review',
    createdBy: 'Erel',
    relatedAgent: 'strategy',
    updatedAt: '2026-03-04T14:30:00Z',
  },
  {
    id: 't8',
    title: 'Post lead installer job listing — crawlspace division',
    description: 'Post to Indeed, ZipRecruiter, and Craigslist. Budget: $150/mo ads.',
    assignee: 'Misty',
    priority: 'high',
    dueDate: '2026-03-06',
    projectId: 'p7',
    tags: ['hiring', 'staffing', 'crawlspace'],
    status: 'in_progress',
    createdBy: 'Misty',
    relatedAgent: null,
    updatedAt: '2026-03-05T09:00:00Z',
  },
  {
    id: 't9',
    title: 'Invoice client — Marysville attic blown-in job',
    description: 'Job completed 3/3. Generate QuickBooks invoice. Net 15.',
    assignee: 'Diane',
    priority: 'high',
    dueDate: '2026-03-06',
    projectId: 'p8',
    tags: ['invoicing', 'quickbooks', 'marysville'],
    status: 'todo',
    createdBy: 'Diane',
    relatedAgent: null,
    updatedAt: '2026-03-05T07:00:00Z',
  },
  {
    id: 't10',
    title: 'Create Bellevue spray foam service landing page',
    description: 'Target KW: "spray foam insulation Bellevue WA". CRO-optimized with trust signals.',
    assignee: 'Marketing Agent',
    priority: 'medium',
    dueDate: '2026-03-14',
    projectId: 'p6',
    tags: ['seo', 'landing-page', 'bellevue', 'spray-foam'],
    status: 'in_progress',
    createdBy: 'Erel',
    relatedAgent: 'landing_page_content',
    updatedAt: '2026-03-05T11:00:00Z',
  },
  {
    id: 't11',
    title: 'Google Ads optimization — Q2 insulation campaigns',
    description: 'Increase budget for top performers. Pause underperforming ad groups. Update RSAs.',
    assignee: 'Ads Agent',
    priority: 'high',
    dueDate: '2026-03-10',
    projectId: 'p6',
    tags: ['ads', 'google-ads', 'ppc'],
    status: 'in_progress',
    createdBy: 'Erel',
    relatedAgent: 'google_meta_ads',
    updatedAt: '2026-03-05T10:30:00Z',
  },
  {
    id: 't12',
    title: 'Complete evrnew.com technical SEO audit',
    description: 'Core Web Vitals, schema markup, internal linking, site speed.',
    assignee: 'Technical SEO Agent',
    priority: 'medium',
    dueDate: '2026-03-01',
    projectId: 'p6',
    tags: ['seo', 'technical', 'audit'],
    status: 'done',
    createdBy: 'Erel',
    relatedAgent: 'technical_seo',
    updatedAt: '2026-03-01T17:00:00Z',
  },
  {
    id: 't13',
    title: 'Onboard Oscar — new field technician',
    description: 'Complete I-9, benefits enrollment, field safety training, tool check-out.',
    assignee: 'Misty',
    priority: 'high',
    dueDate: '2026-02-28',
    projectId: 'p7',
    tags: ['onboarding', 'hr', 'field-tech'],
    status: 'done',
    createdBy: 'Misty',
    relatedAgent: null,
    updatedAt: '2026-02-28T16:00:00Z',
  },
  {
    id: 't14',
    title: 'Set up QuickBooks + GHL invoice sync',
    description: 'Automate QB invoice creation when GHL opportunity moves to "Won".',
    assignee: 'Erel',
    priority: 'high',
    dueDate: '2026-03-20',
    projectId: 'p8',
    tags: ['quickbooks', 'ghl', 'automation', 'finance'],
    status: 'todo',
    createdBy: 'Diane',
    relatedAgent: null,
    updatedAt: '2026-03-04T12:00:00Z',
  },
  {
    id: 't15',
    title: 'Competitor analysis: Top 5 insulation companies in Seattle',
    description: 'Pricing, services, reviews, ad strategy, differentiators.',
    assignee: 'Competitive Intel Agent',
    priority: 'medium',
    dueDate: '2026-03-11',
    projectId: 'p6',
    tags: ['competitor', 'research', 'seattle'],
    status: 'review',
    createdBy: 'Erel',
    relatedAgent: 'competitive_intelligence',
    updatedAt: '2026-03-04T18:00:00Z',
  },
]

// ─────────────────────────────────────────────
// CALENDAR EVENTS — Seed Data
// ─────────────────────────────────────────────

export const calendarEvents: CalendarEvent[] = [
  {
    id: 'e1',
    title: 'Attic blown-in install — Kirkland, WA',
    date: '2026-03-05',
    time: '08:00',
    duration: 360,
    category: 'job',
    status: 'confirmed',
    description: 'Residential attic: 2,200 sqft, R-49 blown-in. Crew: Clint + AJ.',
    location: '412 Lakeview Dr, Kirkland WA',
    assignee: 'Clint',
  },
  {
    id: 'e2',
    title: 'Crawlspace estimate — Marysville',
    date: '2026-03-06',
    time: '10:00',
    duration: 90,
    category: 'estimate',
    status: 'scheduled',
    description: 'Thompson residence. Suspected moisture, existing vapor barrier failure.',
    location: '2847 88th St NE, Marysville WA',
    assignee: 'Johnny',
  },
  {
    id: 'e3',
    title: 'Commercial spray foam bid — Everett office park',
    date: '2026-03-06',
    time: '14:00',
    duration: 120,
    category: 'estimate',
    status: 'scheduled',
    description: 'Cascade Tech HQ. Open-cell spray foam, 18,000 sqft.',
    location: '1800 Everett Mall Way, Everett WA',
    assignee: 'Johnny',
  },
  {
    id: 'e4',
    title: 'Customer follow-up — Johnson attic rebate',
    date: '2026-03-07',
    time: '09:00',
    duration: 30,
    category: 'sales',
    status: 'scheduled',
    description: 'Confirm PSE rebate check received. Ask for Google review.',
    assignee: 'Johnny',
  },
  {
    id: 'e5',
    title: 'GHL automation setup — estimate follow-up sequence',
    date: '2026-03-07',
    time: '13:00',
    duration: 180,
    category: 'automation',
    status: 'scheduled',
    description: 'Build 3-touch email+SMS drip in GoHighLevel for unresponded estimates.',
    assignee: 'Erel',
  },
  {
    id: 'e6',
    title: 'Payroll processing — bi-weekly',
    date: '2026-03-07',
    time: '12:00',
    duration: 60,
    category: 'admin',
    status: 'scheduled',
    description: 'Process payroll for Clint, AJ, Ana, Oscar. Submit via Gusto.',
    assignee: 'Diane',
  },
  {
    id: 'e7',
    title: 'Spray foam install — commercial job, Arlington',
    date: '2026-03-09',
    time: '07:00',
    duration: 480,
    category: 'job',
    status: 'confirmed',
    description: 'New construction warehouse. Closed-cell foam, roof deck and walls.',
    location: '7432 Division St, Arlington WA',
    assignee: 'Clint',
  },
  {
    id: 'e8',
    title: 'PSE rebate submission deadline',
    date: '2026-03-10',
    time: '17:00',
    duration: 0,
    category: 'reminder',
    status: 'scheduled',
    description: 'Johnson + Garcia rebate paperwork must be submitted by 5pm.',
    assignee: 'Diane',
  },
  {
    id: 'e9',
    title: 'Crawlspace encapsulation — Bellevue',
    date: '2026-03-11',
    time: '08:00',
    duration: 480,
    category: 'job',
    status: 'confirmed',
    description: '1,800 sqft. Full vapor barrier, insulation, and dehumidifier install.',
    location: '8934 156th Ave SE, Bellevue WA',
    assignee: 'AJ',
  },
  {
    id: 'e10',
    title: 'Hiring: Lead Installer interviews',
    date: '2026-03-12',
    time: '10:00',
    duration: 180,
    category: 'admin',
    status: 'scheduled',
    description: '3 candidates for crawlspace division lead role.',
    assignee: 'Misty',
  },
  {
    id: 'e11',
    title: 'Cron: health-check.sh',
    date: '2026-03-05',
    time: '00:00',
    duration: 5,
    category: 'automation',
    status: 'confirmed',
    description: 'Automated system health check. Runs every 15 minutes via launchd.',
    assignee: 'Erel',
  },
  {
    id: 'e12',
    title: 'Weekly attic inspection — Everett cluster',
    date: '2026-03-13',
    time: '09:00',
    duration: 240,
    category: 'job',
    status: 'scheduled',
    description: '4 warranty follow-ups in Everett cluster. Oscar driving.',
    location: 'Everett, WA',
    assignee: 'Oscar',
  },
]

// ─────────────────────────────────────────────
// MEMORY — Seed Data
// ─────────────────────────────────────────────

export const memories: Memory[] = [
  {
    id: 'm1',
    title: 'Johnson Residence — Attic Blown-In Project',
    summary: 'Completed 2/28. R-49 blown-in, 2,400 sqft. PSE rebate submitted. Customer very happy — asked for referral card. Follow up in 6 months for crawlspace check.',
    category: 'Customers',
    tags: ['attic', 'blown-in', 'pse-rebate', 'kirkland'],
    relatedProject: 'p4',
    source: 'GoHighLevel CRM',
    updatedAt: '2026-03-01T09:00:00Z',
  },
  {
    id: 'm2',
    title: 'PSE Rebate Process — Step-by-Step',
    summary: 'Puget Sound Energy rebate requires: (1) Pre-approval before job, (2) R-value verification form, (3) Utility bill showing address, (4) Invoice copy, (5) Submit within 60 days of completion. Typical payout: $400–$1,200.',
    category: 'Finance',
    tags: ['rebate', 'pse', 'process', 'compliance'],
    relatedProject: 'p9',
    source: 'Internal Documentation',
    updatedAt: '2026-03-02T14:00:00Z',
  },
  {
    id: 'm3',
    title: 'Amazon HQ Renovation — Commercial Lead Details',
    summary: 'Contacted via web form 3/4. Decision maker: Facilities Manager, Brian Cole. 18,000 sqft open-cell. Timeline: Q2 start. Budget: flexible. Competing with 2 other bids. Key differentiator: our commercial insurance coverage and crew size.',
    category: 'Sales',
    tags: ['commercial', 'amazon', 'bellevue', 'spray-foam', 'high-value'],
    relatedProject: 'p2',
    source: 'GoHighLevel CRM',
    updatedAt: '2026-03-05T09:45:00Z',
  },
  {
    id: 'm4',
    title: 'Spray Foam Pricing — King County 2026',
    summary: 'Current market rates: Open-cell $1.00–1.25/sqft at 3.5". Closed-cell $2.00–2.50/sqft at 2". EVRNEW margin target: 45% gross. Material cost: ~$0.55/sqft open-cell. Key cost driver: crew day rate $800/day (2-person team).',
    category: 'Finance',
    tags: ['pricing', 'spray-foam', 'king-county', 'margins'],
    relatedProject: 'p2',
    source: 'Internal Operations',
    updatedAt: '2026-02-20T10:00:00Z',
  },
  {
    id: 'm5',
    title: 'Top Competitors — Insulation in Seattle MSA',
    summary: 'Main competitors: (1) RetroFoam of WA — strong on spray foam, $1.4M+ revenue. (2) Dr. Energy Saver — national franchise, high ad spend. (3) PNW Insulation — crawlspace specialists. Our edge: local, faster scheduling, AI-powered follow-up, competitive pricing.',
    category: 'Sales',
    tags: ['competitors', 'seattle', 'market-research'],
    relatedProject: 'p6',
    source: 'Competitive Intelligence Agent',
    updatedAt: '2026-03-04T18:00:00Z',
  },
  {
    id: 'm6',
    title: 'GoHighLevel Pipeline Structure',
    summary: 'Stages: New Lead → Estimate Scheduled → Estimate Sent → Follow-Up → Won / Lost. Automations: immediate auto-reply SMS, 24hr follow-up email, 3-day call reminder. All reps must log notes after every touchpoint.',
    category: 'Operations',
    tags: ['ghl', 'crm', 'pipeline', 'automation'],
    relatedProject: 'p5',
    source: 'Internal Operations',
    updatedAt: '2026-02-15T11:00:00Z',
  },
  {
    id: 'm7',
    title: 'Misty — Hiring Process Notes',
    summary: 'Current open roles: Lead Installer (crawlspace), Field Tech (general). Screening: 10-min phone → in-person demo day → background check. Offer process: verbal first, written within 48hrs. Indeed ads converting at ~$180/hire currently.',
    category: 'Team',
    tags: ['hiring', 'hr', 'staffing', 'misty'],
    relatedProject: 'p7',
    source: 'HR Operations',
    updatedAt: '2026-03-03T15:00:00Z',
  },
  {
    id: 'm8',
    title: 'Vendor: Honeywell — Blown-In Insulation Supply',
    summary: 'Primary blown-in material supplier. Account #: HW-447821. Lead time: next day for < 200 bags, 2-day for bulk. Net 30 terms. Rep: Dave Whitman, 425-555-0198. Typical order: 40-80 bags per attic job.',
    category: 'Vendors',
    tags: ['vendor', 'blown-in', 'materials', 'supply-chain'],
    relatedProject: null,
    source: 'Operations',
    updatedAt: '2026-01-10T09:00:00Z',
  },
  {
    id: 'm9',
    title: 'Email Drip — Unresponded Estimate Sequence',
    summary: 'Day 1: Warm check-in email + value prop. Day 3: SMS from Johnny personally. Day 7: Last chance + urgency (season/availability). Open rates: Day 1 = 68%, Day 3 SMS = 94%, Day 7 = 41%. Conversion from drip: ~22%.',
    category: 'Automations',
    tags: ['email', 'drip', 'ghl', 'automation', 'conversion'],
    relatedProject: 'p5',
    source: 'Email Drip Agent',
    updatedAt: '2026-02-28T12:00:00Z',
  },
  {
    id: 'm10',
    title: 'Crawlspace Division — Launch Checklist',
    summary: 'To launch as standalone service line: (1) Hire dedicated lead installer, (2) Acquire encapsulation equipment (dehumidifier supply deal), (3) Build dedicated landing page, (4) Set up GHL pipeline variant, (5) Train sales scripts. Target: 8 jobs/month by Q3.',
    category: 'Operations',
    tags: ['crawlspace', 'division', 'launch', 'planning'],
    relatedProject: 'p3',
    source: 'Internal Planning',
    updatedAt: '2026-03-01T16:00:00Z',
  },
]

// ─────────────────────────────────────────────
// PROJECTS — Seed Data
// ─────────────────────────────────────────────

export const projects: Project[] = [
  {
    id: 'p1',
    name: 'EVRNEW Operations Build-Out',
    description: 'Systematize all field, admin, and sales operations into documented, repeatable workflows. SOPs for every role and process.',
    status: 'active',
    owner: 'Erel',
    priority: 'critical',
    blockers: [],
    nextActions: ['Finalize attic SOP v3.0', 'Create crawlspace field checklist', 'Document estimate-to-invoice flow'],
    percentComplete: 38,
    updatedAt: '2026-03-05T09:00:00Z',
  },
  {
    id: 'p2',
    name: 'Insulation Sales Pipeline',
    description: 'Build and optimize the full B2C and B2B sales pipeline from lead capture to closed job, including scripts, follow-up, and CRM workflows.',
    status: 'active',
    owner: 'Johnny',
    priority: 'high',
    blockers: [],
    nextActions: ['Close Amazon HQ bid', 'Follow up Martinez estimate', 'Train on new GHL pipeline stages'],
    percentComplete: 55,
    updatedAt: '2026-03-05T08:30:00Z',
  },
  {
    id: 'p3',
    name: 'Crawlspace Division Launch',
    description: 'Launch crawlspace encapsulation as a dedicated service line with its own crew, equipment, marketing, and pipeline.',
    status: 'active',
    owner: 'Erel',
    priority: 'high',
    blockers: ['Need dedicated lead installer hired first'],
    nextActions: ['Post job listings', 'Get equipment pricing from suppliers', 'Build dedicated landing page'],
    percentComplete: 20,
    updatedAt: '2026-03-03T15:00:00Z',
  },
  {
    id: 'p4',
    name: 'Attic Remediation Services',
    description: 'Develop attic remediation (mold, rodent, air-sealing) as an upsell service bundled with insulation installs.',
    status: 'planning',
    owner: 'Clint',
    priority: 'medium',
    blockers: ['Need licensing research for remediation work in WA'],
    nextActions: ['Research WA state contractor license requirements', 'Get sub-contractor quotes for mold remediation'],
    percentComplete: 10,
    updatedAt: '2026-02-20T11:00:00Z',
  },
  {
    id: 'p5',
    name: 'CRM / GoHighLevel System',
    description: 'Build out GHL as the central hub for all leads, pipelines, automations, reputation management, and communication.',
    status: 'active',
    owner: 'Erel',
    priority: 'critical',
    blockers: [],
    nextActions: ['Build estimate follow-up drip', 'Set up QuickBooks sync', 'Activate reputation management campaigns'],
    percentComplete: 60,
    updatedAt: '2026-03-04T16:00:00Z',
  },
  {
    id: 'p6',
    name: 'Marketing Automation Pipeline',
    description: 'Run and optimize all digital marketing: Google Ads, Meta, SEO, content, social, email, and competitive intelligence.',
    status: 'active',
    owner: 'Marketing Agent',
    priority: 'high',
    blockers: [],
    nextActions: ['Q1 campaign review', 'Launch Bellevue spray foam landing page', 'Optimize Google Ads for Q2'],
    percentComplete: 65,
    updatedAt: '2026-03-05T11:00:00Z',
  },
  {
    id: 'p7',
    name: 'Hiring / Staffing Build-Out',
    description: 'Build the team needed to scale: lead installer, additional field tech, admin support. Define roles, comp, and onboarding.',
    status: 'active',
    owner: 'Misty',
    priority: 'high',
    blockers: [],
    nextActions: ['Post crawlspace lead installer listing', 'Interview 3 candidates week of 3/12', 'Draft offer letter template'],
    percentComplete: 40,
    updatedAt: '2026-03-05T09:00:00Z',
  },
  {
    id: 'p8',
    name: 'QuickBooks / Invoicing Workflow',
    description: 'Automate invoicing end-to-end: GHL won → QB invoice → payment tracking → follow-up.',
    status: 'blocked',
    owner: 'Diane',
    priority: 'high',
    blockers: ['GHL-QuickBooks API integration not yet configured', 'Need QuickBooks Online API credentials from Diane'],
    nextActions: ['Get QB API credentials from Diane', 'Test GHL-QB Zapier bridge', 'Set up payment reminder automations'],
    percentComplete: 15,
    updatedAt: '2026-03-04T12:00:00Z',
  },
  {
    id: 'p9',
    name: 'Rebate Fulfillment System',
    description: 'Systematize energy rebate filing (PSE, Seattle City Light, Snohomish PUD) to capture rebates on every eligible job.',
    status: 'active',
    owner: 'Finance Agent',
    priority: 'medium',
    blockers: [],
    nextActions: ['Submit PSE forms for Johnson + Garcia', 'Build rebate tracking spreadsheet', 'Research Snohomish PUD program'],
    percentComplete: 30,
    updatedAt: '2026-03-02T14:00:00Z',
  },
  {
    id: 'p10',
    name: 'Contents / Pack-Out Systems',
    description: 'Develop contents handling and pack-out as a restoration add-on service for water and smoke damage customers.',
    status: 'planning',
    owner: 'Erel',
    priority: 'low',
    blockers: ['Not yet resourced — future expansion'],
    nextActions: ['Research pack-out licensing and certifications', 'Survey existing restoration companies for partnership'],
    percentComplete: 5,
    updatedAt: '2026-02-10T10:00:00Z',
  },
]

// ─────────────────────────────────────────────
// DOCUMENTS — Seed Data
// ─────────────────────────────────────────────

export const documents: Document[] = [
  {
    id: 'd1',
    title: 'Attic Insulation Estimate — Martinez Residence',
    type: 'estimate',
    category: 'Estimates',
    tags: ['attic', 'blown-in', 'seattle', 'estimate'],
    relatedProject: 'p2',
    createdAt: '2026-03-02T10:00:00Z',
    updatedAt: '2026-03-02T10:00:00Z',
    owner: 'Johnny',
    preview: 'Estimate for 2,100 sqft attic blown-in insulation at R-49. Total: $3,200. Includes air sealing at ceiling penetrations.',
  },
  {
    id: 'd2',
    title: 'Crawlspace Encapsulation SOW — Kirkland',
    type: 'sow',
    category: 'Scopes of Work',
    tags: ['crawlspace', 'sow', 'kirkland', 'encapsulation'],
    relatedProject: 'p3',
    createdAt: '2026-03-01T14:00:00Z',
    updatedAt: '2026-03-01T14:00:00Z',
    owner: 'Erel',
    preview: 'Full encapsulation: vapor barrier install (20-mil), insulation on walls, conditioned air source, and dehumidifier. 1,800 sqft crawl.',
  },
  {
    id: 'd3',
    title: 'Field Technician SOP — Attic Installation v2.1',
    type: 'sop',
    category: 'SOPs',
    tags: ['sop', 'field', 'attic', 'installation', 'training'],
    relatedProject: 'p1',
    createdAt: '2026-01-15T09:00:00Z',
    updatedAt: '2026-02-20T11:00:00Z',
    owner: 'Erel',
    preview: 'Step-by-step guide for attic blown-in jobs. Includes setup, blower calibration, coverage verification, photo checklist, and cleanup.',
  },
  {
    id: 'd4',
    title: 'Commercial Spray Foam Proposal — Cascade Tech',
    type: 'proposal',
    category: 'Proposals',
    tags: ['commercial', 'spray-foam', 'everett', 'proposal'],
    relatedProject: 'p2',
    createdAt: '2026-03-04T16:00:00Z',
    updatedAt: '2026-03-05T09:45:00Z',
    owner: 'Erel',
    preview: 'Open-cell spray foam proposal for 18,000 sqft commercial renovation. Scope, timeline, warranty, and references included.',
  },
  {
    id: 'd5',
    title: 'PSE Energy Rebate Packet — Johnson Residence',
    type: 'rebate',
    category: 'Rebate Paperwork',
    tags: ['rebate', 'pse', 'johnson', 'attic'],
    relatedProject: 'p9',
    createdAt: '2026-03-03T10:00:00Z',
    updatedAt: '2026-03-03T10:00:00Z',
    owner: 'Diane',
    preview: 'Complete PSE rebate submission packet: pre-approval confirmation, R-value cert, utility address verification, and invoice copy.',
  },
  {
    id: 'd6',
    title: 'Lead Installer Interview Script — Crawlspace Division',
    type: 'script',
    category: 'Scripts',
    tags: ['hiring', 'interview', 'script', 'crawlspace'],
    relatedProject: 'p7',
    createdAt: '2026-03-04T13:00:00Z',
    updatedAt: '2026-03-04T13:00:00Z',
    owner: 'Misty',
    preview: 'Structured interview guide for lead installer role. Sections: experience questions, scenario challenges, skills demo, compensation discussion.',
  },
  {
    id: 'd7',
    title: 'Q1 2026 Marketing Performance Report',
    type: 'marketing',
    category: 'Marketing Assets',
    tags: ['marketing', 'q1', 'report', 'analytics', 'google-ads'],
    relatedProject: 'p6',
    createdAt: '2026-03-04T15:00:00Z',
    updatedAt: '2026-03-05T11:00:00Z',
    owner: 'Marketing Agent',
    preview: 'Q1 summary: 847 leads, $18,420 ad spend, 4.1% conversion rate. Top performers: attic insulation + spray foam campaigns in Bellevue.',
  },
  {
    id: 'd8',
    title: 'GHL CRM Automation Map v1.0',
    type: 'sop',
    category: 'SOPs',
    tags: ['ghl', 'automation', 'crm', 'diagram'],
    relatedProject: 'p5',
    createdAt: '2026-02-25T10:00:00Z',
    updatedAt: '2026-03-01T09:00:00Z',
    owner: 'Erel',
    preview: 'Full automation workflow map for GoHighLevel: lead entry, pipeline stages, triggers, SMS/email sequences, and won/lost outcomes.',
  },
  {
    id: 'd9',
    title: 'Sales Call Script — Residential Insulation',
    type: 'script',
    category: 'Scripts',
    tags: ['sales', 'script', 'residential', 'phone'],
    relatedProject: 'p2',
    createdAt: '2026-02-10T09:00:00Z',
    updatedAt: '2026-02-15T14:00:00Z',
    owner: 'Johnny',
    preview: 'Inbound call script covering: needs assessment, key qualifying questions, value delivery, and booking the estimate.',
  },
  {
    id: 'd10',
    title: 'Crawlspace Division Landing Page Copy',
    type: 'marketing',
    category: 'Marketing Assets',
    tags: ['crawlspace', 'landing-page', 'seo', 'copy'],
    relatedProject: 'p3',
    createdAt: '2026-03-05T11:00:00Z',
    updatedAt: '2026-03-05T11:00:00Z',
    owner: 'Marketing Agent',
    preview: 'SEO-optimized copy for crawlspace encapsulation service page targeting "crawl space insulation Seattle WA". E-E-A-T compliant.',
  },
]

// ─────────────────────────────────────────────
// TEAM — Seed Data
// ─────────────────────────────────────────────

export const teamMembers: TeamMember[] = [
  // Human Team
  {
    id: 'tm1',
    name: 'Johnny',
    role: 'Sales Lead',
    type: 'human',
    avatar: 'JN',
    responsibilities: ['Lead qualification', 'On-site estimates', 'Sales calls', 'Customer relationship management', 'Pipeline management in GHL'],
    status: 'active',
    currentActivity: 'Following up on Martinez attic estimate',
    workload: 'heavy',
  },
  {
    id: 'tm2',
    name: 'Misty',
    role: 'Operations & HR Manager',
    type: 'human',
    avatar: 'MS',
    responsibilities: ['Scheduling crew', 'Hiring & onboarding', 'HR compliance', 'Operations coordination', 'Vendor relations'],
    status: 'active',
    currentActivity: 'Reviewing lead installer applicants',
    workload: 'heavy',
  },
  {
    id: 'tm3',
    name: 'Clint',
    role: 'Lead Field Technician',
    type: 'human',
    avatar: 'CL',
    responsibilities: ['Attic insulation installs', 'Spray foam application', 'Crew supervision', 'Quality control', 'Equipment maintenance'],
    status: 'active',
    currentActivity: 'Attic install — Kirkland job site',
    workload: 'heavy',
  },
  {
    id: 'tm4',
    name: 'Diane',
    role: 'Finance & Admin',
    type: 'human',
    avatar: 'DN',
    responsibilities: ['Invoicing & QuickBooks', 'Rebate filings', 'Payroll coordination', 'Accounts receivable', 'Admin support'],
    status: 'active',
    currentActivity: 'Processing Marysville job invoice',
    workload: 'normal',
  },
  {
    id: 'tm5',
    name: 'AJ',
    role: 'Field Technician',
    type: 'human',
    avatar: 'AJ',
    responsibilities: ['Insulation installation', 'Crawlspace work', 'Site prep & cleanup', 'Material handling'],
    status: 'active',
    currentActivity: 'On-site — Kirkland attic job',
    workload: 'heavy',
  },
  {
    id: 'tm6',
    name: 'Ana',
    role: 'Field Technician',
    type: 'human',
    avatar: 'AN',
    responsibilities: ['Insulation installation', 'Attic prep', 'Air sealing', 'Site photography & documentation'],
    status: 'away',
    currentActivity: 'Day off',
    workload: 'light',
  },
  {
    id: 'tm7',
    name: 'Oscar',
    role: 'Field Technician',
    type: 'human',
    avatar: 'OS',
    responsibilities: ['Insulation installation', 'Warranty follow-ups', 'Material delivery runs', 'Job site setup'],
    status: 'active',
    currentActivity: 'Warranty inspection runs — Everett cluster',
    workload: 'normal',
  },
  // AI Operations Team (Mission Control agents)
  {
    id: 'tm8',
    name: 'Erel',
    role: 'Chief of Staff AI',
    type: 'ai',
    avatar: 'ER',
    responsibilities: ['System orchestration', 'Strategy & decisions', 'Project coordination', 'Agent management', 'Internal comms & reporting'],
    status: 'active',
    currentActivity: 'Building Mission Control app',
    workload: 'heavy',
    model: 'Claude Sonnet 4.6',
    tools: ['All MCP servers', 'Claude Code', 'Convex', 'Netlify'],
  },
  {
    id: 'tm9',
    name: 'Sales Agent',
    role: 'AI Sales Coordinator',
    type: 'ai',
    avatar: 'SA',
    responsibilities: ['Lead qualification automation', 'GHL pipeline management', 'Estimate follow-up triggers', 'Win/loss analysis'],
    status: 'active',
    currentActivity: 'Monitoring estimate follow-up queue',
    workload: 'normal',
    model: 'Claude Sonnet',
    tools: ['GoHighLevel API', 'Gmail API', 'Memory MCP'],
  },
  {
    id: 'tm10',
    name: 'Operations Agent',
    role: 'AI Operations Coordinator',
    type: 'ai',
    avatar: 'OA',
    responsibilities: ['SOP maintenance', 'Workflow optimization', 'Job scheduling support', 'Field team coordination'],
    status: 'active',
    currentActivity: 'Updating attic installation SOP v3.0',
    workload: 'normal',
    model: 'Claude Sonnet',
    tools: ['Filesystem MCP', 'Memory MCP', 'Sequential Thinking'],
  },
  {
    id: 'tm11',
    name: 'Finance Agent',
    role: 'AI Finance Coordinator',
    type: 'ai',
    avatar: 'FA',
    responsibilities: ['Rebate tracking', 'Invoice generation support', 'QuickBooks sync monitoring', 'Financial reporting'],
    status: 'active',
    currentActivity: 'Preparing PSE rebate submission packet',
    workload: 'normal',
    model: 'Claude Sonnet',
    tools: ['QuickBooks API', 'GoHighLevel', 'Filesystem MCP'],
  },
  {
    id: 'tm12',
    name: 'Marketing Agent',
    role: 'AI Marketing Coordinator',
    type: 'ai',
    avatar: 'MA',
    responsibilities: ['Campaign performance monitoring', 'Content creation', 'Landing page optimization', 'SEO recommendations'],
    status: 'busy',
    currentActivity: 'Writing Bellevue spray foam landing page copy',
    workload: 'heavy',
    model: 'Claude Sonnet',
    tools: ['DataForSEO', 'BrowserBase', 'Buffer API', 'GHL'],
  },
  {
    id: 'tm13',
    name: 'Scheduling Agent',
    role: 'AI Scheduling Coordinator',
    type: 'ai',
    avatar: 'SC',
    responsibilities: ['Job scheduling optimization', 'Crew availability tracking', 'Calendar management', 'Reminder automation'],
    status: 'active',
    currentActivity: 'Checking crew availability for Kirkland crawlspace',
    workload: 'light',
    model: 'Grok Fast',
    tools: ['GHL API', 'Gmail API', 'Memory MCP'],
  },
  {
    id: 'tm14',
    name: 'HR Agent',
    role: 'AI Recruiting Coordinator',
    type: 'ai',
    avatar: 'HA',
    responsibilities: ['Job posting management', 'Applicant screening', 'Interview scheduling', 'Onboarding task automation'],
    status: 'active',
    currentActivity: 'Drafting lead installer job description',
    workload: 'normal',
    model: 'Claude Sonnet',
    tools: ['Indeed API', 'Gmail API', 'Memory MCP'],
  },
  {
    id: 'tm15',
    name: 'Documentation Agent',
    role: 'AI SOP & Docs Coordinator',
    type: 'ai',
    avatar: 'DA',
    responsibilities: ['SOP writing & updating', 'Process documentation', 'Training materials', 'Knowledge base management'],
    status: 'busy',
    currentActivity: 'Writing Attic Installation SOP v3.0',
    workload: 'heavy',
    model: 'Claude Sonnet',
    tools: ['Filesystem MCP', 'Memory MCP', 'Sequential Thinking'],
  },
]

// The 8 existing system/marketing agents from the server
export const systemAgents = [
  { id: 'sa1', name: 'competitive_intelligence', role: 'Monitor competitors, Google Alerts, reviews', model: 'Grok Fast', tools: 'BrowserBase, Playwright, web scraping', badge: 'purple' },
  { id: 'sa2', name: 'strategy', role: 'Campaign planning, market analysis, decisions', model: 'Claude Opus', tools: 'Memory MCP, sequential-thinking MCP', badge: 'blue' },
  { id: 'sa3', name: 'google_meta_ads', role: 'Google Ads + Meta Ads management & optimization', model: 'Claude Sonnet', tools: 'Google Ads API, Meta API, GHL', badge: 'red' },
  { id: 'sa4', name: 'blog_seo_content', role: 'Blog posts, landing pages, E-E-A-T content', model: 'Claude Sonnet', tools: 'DataForSEO, Search Console, fetch MCP', badge: 'green' },
  { id: 'sa5', name: 'social_media', role: 'Social posts, scheduling, engagement', model: 'Grok Fast', tools: 'Buffer API, BrowserBase', badge: 'yellow' },
  { id: 'sa6', name: 'technical_seo', role: 'Site audits, Core Web Vitals, schema markup', model: 'Grok Fast', tools: 'DataForSEO, Search Console alerts', badge: 'blue' },
  { id: 'sa7', name: 'email_drip', role: 'GHL drip campaigns, lead nurturing sequences', model: 'Claude Sonnet', tools: 'GHL API, SendGrid, Gmail API', badge: 'purple' },
  { id: 'sa8', name: 'landing_page_content', role: 'CRO-optimized landing page copy', model: 'Claude Sonnet', tools: 'BrowserBase, GHL, SpyFu', badge: 'green' },
]

// ─────────────────────────────────────────────
// ACTIVITY FEED — Seed Data
// ─────────────────────────────────────────────

export const activityLogs: ActivityLog[] = [
  { id: 'a1', timestamp: '2026-03-05T11:42:00Z', action: 'Task created', category: 'task', actor: 'Erel', details: 'Created: "Build GHL automation: estimate follow-up 3-touch sequence"', relatedId: 't6' },
  { id: 'a2', timestamp: '2026-03-05T11:00:00Z', action: 'Document generated', category: 'document', actor: 'Marketing Agent', details: 'Generated: "Crawlspace Division Landing Page Copy" (1,840 words)', relatedId: 'd10' },
  { id: 'a3', timestamp: '2026-03-05T10:30:00Z', action: 'Task updated', category: 'task', actor: 'Ads Agent', details: 'Moved "Google Ads optimization Q2" to In Progress. Paused 3 underperforming ad groups.', relatedId: 't11' },
  { id: 'a4', timestamp: '2026-03-05T10:00:00Z', action: 'Task updated', category: 'task', actor: 'Documentation Agent', details: 'Updated attic SOP v3.0 — added blower door test section (draft).', relatedId: 't5' },
  { id: 'a5', timestamp: '2026-03-05T09:45:00Z', action: 'Memory saved', category: 'memory', actor: 'Erel', details: 'Updated memory: "Amazon HQ Renovation — Commercial Lead Details"', relatedId: 'm3' },
  { id: 'a6', timestamp: '2026-03-05T09:15:00Z', action: 'Agent activity', category: 'agent', actor: 'competitive_intelligence', details: 'Completed weekly competitor monitoring scan. 2 new competitor Google Ads detected.', relatedId: 'sa1' },
  { id: 'a7', timestamp: '2026-03-05T08:30:00Z', action: 'Task updated', category: 'task', actor: 'Johnny', details: 'Left note on Martinez follow-up: "VM left, email sent, will call again Thursday 10am"', relatedId: 't1' },
  { id: 'a8', timestamp: '2026-03-05T08:00:00Z', action: 'System check', category: 'system', actor: 'Erel', details: 'Cron health check passed. All services nominal. Disk: 11GB/926GB used.', },
  { id: 'a9', timestamp: '2026-03-05T07:30:00Z', action: 'Email routed', category: 'automation', actor: 'erel_inbox_monitor', details: 'Google Alert routed to competitive_intelligence inbox: "spray foam insulation Seattle competitor"', },
  { id: 'a10', timestamp: '2026-03-04T18:00:00Z', action: 'Document generated', category: 'document', actor: 'Competitive Intel Agent', details: 'Generated Q1 competitor analysis report — 5 competitors profiled.', relatedId: 'd7' },
  { id: 'a11', timestamp: '2026-03-04T16:00:00Z', action: 'Document created', category: 'document', actor: 'Erel', details: 'Created: "Commercial Spray Foam Proposal — Cascade Tech" for Amazon HQ bid.', relatedId: 'd4' },
  { id: 'a12', timestamp: '2026-03-04T15:00:00Z', action: 'Task created', category: 'task', actor: 'Diane', details: 'Created: "Set up QuickBooks + GHL invoice sync" — blocked on API credentials.', relatedId: 't14' },
  { id: 'a13', timestamp: '2026-03-04T14:30:00Z', action: 'Task moved to Review', category: 'task', actor: 'Marketing Agent', details: 'Q1 marketing report moved to Review. 847 leads, $18.4k spend, 4.1% CVR.', relatedId: 't7' },
  { id: 'a14', timestamp: '2026-03-04T13:00:00Z', action: 'Document created', category: 'document', actor: 'Misty', details: 'Created: "Lead Installer Interview Script" for crawlspace division hiring.', relatedId: 'd6' },
  { id: 'a15', timestamp: '2026-03-04T12:00:00Z', action: 'Project updated', category: 'project', actor: 'Diane', details: 'QuickBooks/Invoicing project marked BLOCKED — waiting on API credentials.', relatedId: 'p8' },
  { id: 'a16', timestamp: '2026-03-03T15:00:00Z', action: 'Memory saved', category: 'memory', actor: 'Misty', details: 'Updated hiring process notes — Indeed ads at $180/hire, 3 candidates for crawler role.', relatedId: 'm7' },
  { id: 'a17', timestamp: '2026-03-03T10:00:00Z', action: 'Document created', category: 'document', actor: 'Diane', details: 'Created PSE rebate packet for Johnson residence.', relatedId: 'd5' },
  { id: 'a18', timestamp: '2026-03-02T14:00:00Z', action: 'Memory saved', category: 'memory', actor: 'Finance Agent', details: 'PSE rebate process documentation updated with new 60-day deadline rule.', relatedId: 'm2' },
  { id: 'a19', timestamp: '2026-03-01T17:00:00Z', action: 'Task completed', category: 'task', actor: 'Technical SEO Agent', details: 'Completed evrnew.com technical SEO audit. LCP improved from 3.2s to 1.8s.', relatedId: 't12' },
  { id: 'a20', timestamp: '2026-02-28T16:00:00Z', action: 'Task completed', category: 'task', actor: 'Misty', details: 'Oscar onboarding complete — I-9 done, safety training passed, tools checked out.', relatedId: 't13' },
  { id: 'a21', timestamp: '2026-02-28T12:00:00Z', action: 'Automation triggered', category: 'automation', actor: 'email_drip', details: 'Day-7 last-chance email sent to 4 unresponded estimates. 1 booking response received.', },
  { id: 'a22', timestamp: '2026-02-28T09:00:00Z', action: 'Agent activity', category: 'agent', actor: 'Moltbook heartbeat', details: 'erel_evrnew presence heartbeat sent to Moltbook network. Uptime: 99.8%.', },
]

// ─────────────────────────────────────────────
// SYSTEM SERVICES
// ─────────────────────────────────────────────

export const systemServices: SystemService[] = [
  { id: 'ss1', name: 'Gmail Inbox Monitor', description: 'erel_inbox_monitor.py — polls erel@evrnew.com every 5 min via Gmail API (OAuth2)', status: 'online', lastChecked: '2026-03-05T11:45:00Z', uptime: '99.8%' },
  { id: 'ss2', name: 'Telegram Bot', description: '@evrnew_agent_bot — python-telegram-bot v22 with polling', status: 'online', lastChecked: '2026-03-05T11:45:00Z', uptime: '99.9%' },
  { id: 'ss3', name: 'Ollama LLM', description: 'llama3.2:3b local inference — port 11434', status: 'online', lastChecked: '2026-03-05T11:45:00Z', endpoint: 'http://localhost:11434', uptime: '99.5%' },
  { id: 'ss4', name: 'n8n Automation', description: 'n8n 2.10.2 workflow automation engine', status: 'online', lastChecked: '2026-03-05T11:45:00Z', endpoint: 'http://localhost:5678', uptime: '98.9%' },
  { id: 'ss5', name: 'Moltbook Heartbeat', description: 'erel_evrnew agent — 30min heartbeat via LaunchAgent', status: 'online', lastChecked: '2026-03-05T11:30:00Z', uptime: '99.8%' },
  { id: 'ss6', name: 'Cron: Health Check', description: 'health-check.sh — every 15 minutes', status: 'online', lastChecked: '2026-03-05T11:45:00Z' },
  { id: 'ss7', name: 'Cron: Log Rotation', description: 'log-rotate.sh — Sunday 3 AM', status: 'online', lastChecked: '2026-03-02T03:00:00Z' },
  { id: 'ss8', name: 'Cron: Disk Cleanup', description: 'disk-cleanup.sh — Sunday 4 AM', status: 'online', lastChecked: '2026-03-02T04:00:00Z' },
]

export const integrations: Integration[] = [
  { name: 'Anthropic Claude API', purpose: 'Content, strategy, copy generation', status: 'active' },
  { name: 'Gmail API (OAuth2)', purpose: 'Inbox monitoring, email send for erel@evrnew.com', status: 'active' },
  { name: 'Ollama (local)', purpose: 'Local llama3.2:3b inference', status: 'active' },
  { name: 'xAI Grok API', purpose: 'Fast/cheap monitoring tasks', status: 'active' },
  { name: 'GoHighLevel CRM', purpose: 'Lead management, campaigns, automation', status: 'active' },
  { name: 'DataForSEO', purpose: 'SERP data, keyword research', status: 'active' },
  { name: 'Google Ads API', purpose: 'Ad performance, bid management', status: 'pending', note: 'API key needed' },
  { name: 'SpyFu', purpose: 'Competitor keyword/ad intelligence', status: 'active' },
  { name: 'SendGrid', purpose: 'Transactional email delivery', status: 'active' },
  { name: 'Buffer', purpose: 'Social media scheduling', status: 'active' },
  { name: 'BrowserBase', purpose: 'Cloud Chrome, authenticated scraping', status: 'active' },
  { name: 'Google Maps API', purpose: 'Local SEO, competitor mapping', status: 'active' },
  { name: 'Netlify CLI', purpose: 'Site deployment (openclaw-evrnew.netlify.app)', status: 'active' },
  { name: 'Moltbook API', purpose: 'AI agent social network, agent heartbeat', status: 'active' },
  { name: 'Telegram Bot API', purpose: 'Command & control via @evrnew_agent_bot', status: 'active' },
  { name: 'Google Voice', purpose: 'Phone: +1 (206) 453-0208', status: 'active' },
]

export const mcpServers = [
  { name: 'filesystem', description: 'Read/write access to ~/evrnew-marketing/', status: 'active' },
  { name: 'memory', description: 'Persistent key-value memory across sessions', status: 'active' },
  { name: 'fetch', description: 'HTTP fetch for web content retrieval', status: 'active' },
  { name: 'sequential-thinking', description: 'Multi-step reasoning chains for strategy agent', status: 'active' },
  { name: 'sqlite', description: 'Marketing analytics DB at data/marketing.db', status: 'active' },
  { name: 'github', description: 'Repo management', status: 'active' },
  { name: 'google-maps', description: 'Local business data', status: 'active' },
  { name: 'browserbase', description: 'Cloud Chrome sessions', status: 'active' },
  { name: 'playwright', description: 'Browser automation', status: 'active' },
]

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

export const PRIORITY_COLORS: Record<Priority, string> = {
  critical: 'text-red-400 bg-red-400/10 border-red-400/30',
  high: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  low: 'text-gray-400 bg-gray-400/10 border-gray-400/30',
}

export const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: 'text-gray-400',
  in_progress: 'text-[#00e5ff]',
  review: 'text-yellow-400',
  done: 'text-[#22c55e]',
}

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  active: 'text-[#22c55e] bg-[#22c55e]/10 border-[#22c55e]/30',
  planning: 'text-[#00e5ff] bg-[#00e5ff]/10 border-[#00e5ff]/30',
  blocked: 'text-red-400 bg-red-400/10 border-red-400/30',
  completed: 'text-gray-400 bg-gray-400/10 border-gray-400/30',
}

export function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}
