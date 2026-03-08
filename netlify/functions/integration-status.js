// Netlify Function: integration-status
// Returns live status of each integration by checking whether env vars are set
// and not placeholder values. Called every 5 minutes by the client.

const INTEGRATIONS = [
  { name: 'Anthropic Claude API',   purpose: 'Content, strategy, copy generation',                    envKey: 'ANTHROPIC_API_KEY' },
  { name: 'Gmail API (OAuth2)',      purpose: 'Inbox monitoring, email send for erel@evrnew.com',      envKey: 'EREL_GMAIL_APP_PASSWORD' },
  { name: 'Ollama (local)',          purpose: 'Local llama3.2:3b inference — model running',           envKey: 'OLLAMA_STATUS' },
  { name: 'xAI Grok API',           purpose: 'Fast/cheap monitoring tasks',                           envKey: 'XAI_API_KEY' },
  { name: 'GoHighLevel CRM',        purpose: 'Lead management, campaigns, automation',                envKey: 'GHL_API_KEY' },
  { name: 'DataForSEO',             purpose: 'SERP data, keyword research',                           envKey: 'DATAFORSEO_PASSWORD' },
  { name: 'Google Ads API',         purpose: 'Ad performance, bid management',                        envKey: 'GOOGLE_ADS_DEVELOPER_TOKEN' },
  { name: 'SpyFu',                  purpose: 'Competitor keyword/ad intelligence',                    envKey: 'SPYFU_BASE64_KEY' },
  { name: 'SendGrid',               purpose: 'Transactional email delivery',                          envKey: 'SENDGRID_API_KEY' },
  { name: 'Buffer',                 purpose: 'Social media scheduling',                               envKey: 'BUFFER_ACCESS_TOKEN' },
  { name: 'BrowserBase',            purpose: 'Cloud Chrome, authenticated scraping',                  envKey: 'BROWSERBASE_API_KEY' },
  { name: 'Google Maps API',        purpose: 'Local SEO, competitor mapping',                         envKey: 'GOOGLE_MAPS_API_KEY' },
  { name: 'Google Analytics',       purpose: 'Site traffic & conversion tracking',                    envKey: 'GA_MEASUREMENT_ID' },
  { name: 'GitHub',                 purpose: 'Repo management via MCP',                               envKey: 'GITHUB_TOKEN' },
  { name: 'Twilio',                 purpose: 'SMS/voice automation',                                  envKey: 'TWILIO_ACCOUNT_SID' },
  { name: 'Moltbook API',           purpose: 'AI agent social network, agent heartbeat',              envKey: 'MOLTBOOK_API_KEY' },
  { name: 'Telegram Bot API',       purpose: 'Command & control via @evrnew_agent_bot',               envKey: 'TELEGRAM_BOT_TOKEN' },
  { name: 'Google Voice',           purpose: 'Phone: +1 (206) 453-0208',                             envKey: 'GOOGLE_VOICE_CONFIRMED' },
]

const PLACEHOLDER_PREFIXES = ['REPLACE', 'YOUR_', 'TODO', 'CHANGEME', 'placeholder', 'example']

function isRealValue(val) {
  if (!val || val.trim() === '') return false
  const upper = val.trim().toUpperCase()
  return !PLACEHOLDER_PREFIXES.some(p => upper.startsWith(p.toUpperCase()))
}

function getStatus(envKey) {
  const val = process.env[envKey]
  if (isRealValue(val)) return { status: 'active' }
  return { status: 'pending', note: 'API key needed' }
}

exports.handler = async function () {
  const result = INTEGRATIONS.map(i => ({
    name: i.name,
    purpose: i.purpose,
    ...getStatus(i.envKey),
  }))

  const activeCount  = result.filter(i => i.status === 'active').length
  const pendingCount = result.filter(i => i.status === 'pending').length

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify({
      integrations: result,
      summary: { active: activeCount, pending: pendingCount, total: result.length },
      checkedAt: new Date().toISOString(),
    }),
  }
}
