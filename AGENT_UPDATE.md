# Mission Control Agent Update

Update the EVRNEW Mission Control dashboard to reflect the 8 real system agents now running.

## THE 8 REAL AGENTS (update lib/data/index.ts):

Replace or update the `systemAgents` array with these accurate entries:

```typescript
export const systemAgents: SystemAgent[] = [
  {
    id: 'sa-1',
    role: 'Competitive Intelligence Agent',
    llm: 'claude-3-5-haiku-20241022',
    tools: ['DataForSEO SERP API', 'Facebook Ad Library', 'Google Search', 'Anthropic'],
    schedule: 'Daily 6:00 AM',
    status: 'active',
    lastRun: '2026-03-05T06:00:00',
    outputDir: '~/evrnew-marketing/data/competitors/',
    plist: 'com.evrnew.agent-competitive',
    description: 'Monitors SERP rankings, competitor ad spend, and Facebook Ad Library for the PNW insulation market',
  },
  {
    id: 'sa-2',
    role: 'Google & Meta Ads Agent',
    llm: 'claude-3-5-haiku-20241022',
    tools: ['Anthropic', 'Google Ads API', 'Meta Marketing API'],
    schedule: 'Every 6 hours',
    status: 'active',
    lastRun: '2026-03-05T18:00:00',
    outputDir: '~/evrnew-marketing/data/ads/',
    plist: 'com.evrnew.agent-ads',
    description: 'Generates A/B/C ad copy for Google Search and Facebook/Instagram targeting PNW homeowners',
  },
  {
    id: 'sa-3',
    role: 'Blog & SEO Content Agent',
    llm: 'claude-3-5-haiku-20241022',
    tools: ['Anthropic', 'DataForSEO', 'Google Search Console'],
    schedule: 'Mon & Thu 9:00 AM',
    status: 'active',
    lastRun: '2026-03-03T09:00:00',
    outputDir: '~/evrnew-marketing/data/blog-seo/',
    plist: 'com.evrnew.agent-blog-seo',
    description: 'Generates local SEO blog posts targeting PNW insulation keywords across King, Snohomish, and Skagit counties',
  },
  {
    id: 'sa-4',
    role: 'General Content Agent',
    llm: 'claude-3-5-haiku-20241022',
    tools: ['Anthropic'],
    schedule: 'Daily 7:00 AM',
    status: 'active',
    lastRun: '2026-03-05T07:00:00',
    outputDir: '~/evrnew-marketing/data/content/',
    plist: 'com.evrnew.agent-content',
    description: 'Generates landing pages, email sequences, service page copy, and FAQ content for EVRNEW markets',
  },
  {
    id: 'sa-5',
    role: 'Marketing Strategy Agent',
    llm: 'claude-3-5-haiku-20241022',
    tools: ['Anthropic', 'Competitive Intel Data'],
    schedule: 'Weekly Mon 8:00 AM',
    status: 'active',
    lastRun: '2026-03-03T08:00:00',
    outputDir: '~/evrnew-marketing/data/strategy/',
    plist: 'com.evrnew.agent-strategy',
    description: 'Synthesizes competitive intel and market data into weekly marketing strategy briefs',
  },
  {
    id: 'sa-6',
    role: 'Social Media Agent',
    llm: 'claude-3-5-haiku-20241022',
    tools: ['Anthropic', 'Buffer API'],
    schedule: 'Daily 8:00 AM',
    status: 'active',
    lastRun: '2026-03-05T08:00:00',
    outputDir: '~/evrnew-marketing/data/social/',
    plist: 'com.evrnew.agent-social',
    description: 'Generates daily posts for Facebook, Instagram, and Google Business Profile targeting PNW homeowners',
  },
  {
    id: 'sa-7',
    role: 'Technical SEO Agent',
    llm: 'claude-3-5-haiku-20241022',
    tools: ['Anthropic', 'DataForSEO'],
    schedule: 'Weekly Wed 10:00 AM',
    status: 'active',
    lastRun: '2026-03-04T10:00:00',
    outputDir: '~/evrnew-marketing/data/seo/',
    plist: 'com.evrnew.agent-technical-seo',
    description: 'Generates LocalBusiness schema markup, technical SEO audits, and keyword opportunity reports for evrnew.com',
  },
  {
    id: 'sa-8',
    role: 'Email Drip Agent',
    llm: 'claude-3-5-haiku-20241022',
    tools: ['Anthropic', 'SendGrid'],
    schedule: 'Weekly Tue 9:00 AM',
    status: 'active',
    lastRun: '2026-03-03T09:00:00',
    outputDir: '~/evrnew-marketing/data/email-drip/',
    plist: 'com.evrnew.agent-email-drip',
    description: 'Generates 5-email nurture sequences for attic, crawl space, spray foam, post-estimate, and rebate lead types',
  },
]
```

## ALSO UPDATE: The SystemAgent type in lib/data/index.ts

Make sure the SystemAgent interface includes these fields:
```typescript
export interface SystemAgent {
  id: string
  role: string
  llm: string
  tools: string[]
  schedule: string
  status: 'active' | 'idle' | 'error'
  lastRun?: string
  outputDir?: string
  plist?: string
  description?: string
}
```

## UPDATE app/system/page.tsx

The System Status page should show all 8 agents with:
- Agent name/role
- Status badge (green = active)
- Schedule
- LLM used
- LaunchAgent plist name
- Last run time
- Output directory
- Description

Add an "Agent Fleet" section to app/system/page.tsx that displays all 8 systemAgents as cards.

## UPDATE app/team/page.tsx

The System Agents section (Section 3) should now show all 8 agents with their real roles and descriptions. Make sure it uses the updated systemAgents data.

## UPDATE app/office/page.tsx

The office/operations room should show all 8 agents as active terminal nodes with their real names and current scheduled tasks.

## AFTER MAKING ALL CHANGES:

1. Run: npm run build
2. Fix all TypeScript errors
3. Confirm build passes
4. Deploy: npx netlify-cli deploy --prod --dir=out --site fbdb76d0-6931-4a88-aa73-55284eeaef00
5. When deployed, run: openclaw system event --text "Done: Mission Control updated with all 8 real agents — deployed to Netlify" --mode now
