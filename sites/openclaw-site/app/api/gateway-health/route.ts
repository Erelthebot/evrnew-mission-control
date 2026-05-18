import os from 'os'
import path from 'path'
import fs from 'fs'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Ping OpenClaw gateway
  let gatewayOk = false
  let gatewayLatencyMs = 0
  try {
    const t0 = Date.now()
    const r = await fetch('http://127.0.0.1:18789/', { signal: AbortSignal.timeout(2000), cache: 'no-store' })
    gatewayLatencyMs = Date.now() - t0
    gatewayOk = r.status < 500
  } catch {}

  // Ping relay
  let relayOk = false
  let relayLatencyMs = 0
  try {
    const t0 = Date.now()
    const r = await fetch('http://127.0.0.1:18792/health', { signal: AbortSignal.timeout(2000), cache: 'no-store' })
    relayLatencyMs = Date.now() - t0
    relayOk = r.ok
  } catch {}

  // Read cron jobs
  let cronJobs: object[] = []
  try {
    const jobsPath = path.join(os.homedir(), '.openclaw/cron/jobs.json')
    const raw = fs.readFileSync(jobsPath, 'utf8')
    const data = JSON.parse(raw)
    cronJobs = (data.jobs || []).map((j: Record<string, unknown>) => ({
      id: j.id,
      name: j.name,
      enabled: j.enabled,
      schedule: j.schedule,
      lastStatus: (j.state as Record<string, unknown>)?.lastStatus,
      lastRunAtMs: (j.state as Record<string, unknown>)?.lastRunAtMs,
      nextRunAtMs: (j.state as Record<string, unknown>)?.nextRunAtMs,
      lastDurationMs: (j.state as Record<string, unknown>)?.lastDurationMs,
      consecutiveErrors: (j.state as Record<string, unknown>)?.consecutiveErrors ?? 0,
    }))
  } catch {}

  return Response.json({
    ok: gatewayOk,
    gatewayLatencyMs,
    relayOk,
    relayLatencyMs,
    cronJobs,
    ts: Date.now(),
  })
}
