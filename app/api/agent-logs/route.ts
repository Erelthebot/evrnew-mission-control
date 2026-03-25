import os from 'os'
import path from 'path'
import { execSync } from 'child_process'

export const dynamic = 'force-dynamic'

const AGENTS = [
  'ads', 'blog-seo', 'competitive', 'content',
  'email-drip', 'social', 'strategy', 'technical-seo',
]

export async function GET() {
  const logDir = path.join(os.homedir(), 'evrnew-marketing/logs')
  const result: { agent: string; lines: string[]; sizeKB: number; exists: boolean }[] = []

  for (const agent of AGENTS) {
    const logPath = path.join(logDir, `${agent}.log`)
    try {
      const raw = execSync(`tail -8 "${logPath}" 2>/dev/null`, { encoding: 'utf8' })
      const lines = raw.split('\n').filter(Boolean)
      const stat = execSync(`wc -c < "${logPath}" 2>/dev/null || echo 0`, { encoding: 'utf8' }).trim()
      result.push({ agent, lines, sizeKB: Math.round(parseInt(stat) / 1024), exists: true })
    } catch {
      result.push({ agent, lines: [], sizeKB: 0, exists: false })
    }
  }

  // Also tail the gateway log
  let gatewayLines: string[] = []
  try {
    const gwLog = path.join(os.homedir(), '.openclaw/logs/gateway.log')
    const raw = execSync(`tail -15 "${gwLog}" 2>/dev/null`, { encoding: 'utf8' })
    gatewayLines = raw.split('\n').filter(Boolean)
  } catch {}

  return Response.json({ agents: result, gatewayLines, ts: Date.now() })
}
