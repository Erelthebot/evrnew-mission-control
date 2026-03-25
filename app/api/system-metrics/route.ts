import os from 'os'
import { execSync } from 'child_process'

export const dynamic = 'force-dynamic'

async function getClusterMemory(): Promise<{ totalGB: number; usedGB: number; freeGB: number; pct: number; nodeCount: number } | null> {
  try {
    const res = await fetch('http://localhost:52415/state', { signal: AbortSignal.timeout(2000) })
    if (!res.ok) return null
    const state = await res.json() as Record<string, unknown>
    const nodeMemory = (state.nodeMemory || {}) as Record<string, { ramTotal?: { inBytes?: number }; ramAvailable?: { inBytes?: number } }>
    const nodeIds = Object.keys(nodeMemory)
    if (nodeIds.length === 0) return null
    let totalBytes = 0, usedBytes = 0
    for (const nid of nodeIds) {
      const m = nodeMemory[nid] || {}
      const total = m.ramTotal?.inBytes ?? 0
      const avail = m.ramAvailable?.inBytes ?? 0
      totalBytes += total
      usedBytes += Math.max(total - avail, 0)
    }
    if (totalBytes === 0) return null
    const freeBytes = totalBytes - usedBytes
    return {
      totalGB: +(totalBytes / 1e9).toFixed(1),
      usedGB:  +(usedBytes / 1e9).toFixed(1),
      freeGB:  +(freeBytes / 1e9).toFixed(1),
      pct:     Math.round((usedBytes / totalBytes) * 100),
      nodeCount: nodeIds.length,
    }
  } catch {
    return null
  }
}

export async function GET() {
  const localTotalMem = os.totalmem()
  const localFreeMem = os.freemem()
  const localUsedMem = localTotalMem - localFreeMem

  const cluster = await getClusterMemory()
  const totalMem = cluster ? cluster.totalGB * 1e9 : localTotalMem
  const usedMem  = cluster ? cluster.usedGB  * 1e9 : localUsedMem
  const freeMem  = cluster ? cluster.freeGB  * 1e9 : localFreeMem
  const memPct   = Math.round((usedMem / totalMem) * 100)

  let diskPct = 0, diskUsedGB = 0, diskTotalGB = 0
  try {
    const out = execSync('df -k / | tail -1', { encoding: 'utf8' })
    const p = out.trim().split(/\s+/)
    diskTotalGB = Math.round(parseInt(p[1]) * 1024 / 1e9)
    diskUsedGB  = Math.round(parseInt(p[2]) * 1024 / 1e9)
    diskPct     = parseInt(p[4]) || 0
  } catch {}

  const load = os.loadavg()
  const cpus = os.cpus()
  const uptimeSecs = os.uptime()
  const d = Math.floor(uptimeSecs / 86400)
  const h = Math.floor((uptimeSecs % 86400) / 3600)
  const m = Math.floor((uptimeSecs % 3600) / 60)
  const uptimeStr = d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`

  // GPU + ANE via powermetrics (accurate real-time; ioreg reports stale/zero on M4)
  let gpu = { device: 0, renderer: 0, tiler: 0, memUsedGB: 0, memAllocGB: 0, cores: 20, model: 'Apple M5 Pro', powerMW: 0 }
  let ane = { powerMW: 0 }
  try {
    const pmOut = execSync('sudo powermetrics -n 1 -i 500 --samplers gpu_power,ane_power 2>/dev/null', { timeout: 10000, encoding: 'utf8' })
    const activeMatch = pmOut.match(/GPU HW active residency:\s*([\d.]+)%/)
    if (activeMatch) gpu.device = Math.round(parseFloat(activeMatch[1]))
    const gpuPowerMatch = pmOut.match(/GPU Power:\s*(\d+)\s*mW/)
    if (gpuPowerMatch) gpu.powerMW = parseInt(gpuPowerMatch[1])
    const anePowerMatch = pmOut.match(/ANE Power:\s*(\d+)\s*mW/)
    if (anePowerMatch) ane.powerMW = parseInt(anePowerMatch[1])
  } catch {}
  // GPU memory stats from ioreg (still reliable for memory figures)
  try {
    const ioregOut = execSync('/usr/sbin/ioreg -r -c IOAccelerator 2>/dev/null', { timeout: 5000, encoding: 'utf8' })
    const perfMatch = ioregOut.match(/"PerformanceStatistics"\s*=\s*\{([^}]+)\}/)
    if (perfMatch) {
      const raw = perfMatch[1]
      const ex = (k: string) => {
        const idx = raw.indexOf(`"${k}"=`)
        if (idx === -1) return 0
        const rest = raw.slice(idx + k.length + 3)
        const m = rest.match(/^(\d+)/)
        return m ? parseInt(m[1]) : 0
      }
      gpu.memUsedGB  = Math.round(ex('In use system memory') / 1e9 * 10) / 10
      gpu.memAllocGB = Math.round(ex('Alloc system memory') / 1e9 * 10) / 10
    }
    const coreMatch = ioregOut.match(/"gpu-core-count"\s*=\s*(\d+)/)
    if (coreMatch) gpu.cores = parseInt(coreMatch[1])
  } catch {}

  return Response.json({
    ts: Date.now(),
    uptimeSecs,
    uptimeStr,
    memory: {
      totalGB: +(totalMem / 1e9).toFixed(1),
      usedGB:  +(usedMem / 1e9).toFixed(1),
      freeGB:  +(freeMem / 1e9).toFixed(1),
      pct:     memPct,
      clusterNodes: cluster?.nodeCount ?? 1,
    },
    disk: { totalGB: diskTotalGB, usedGB: diskUsedGB, pct: diskPct },
    load: { '1m': +load[0].toFixed(2), '5m': +load[1].toFixed(2), '15m': +load[2].toFixed(2) },
    cpu: { model: cpus[0]?.model?.replace(/\(.*\)/g, '').trim() || 'M4 Pro', count: cpus.length },
    gpu,
    ane,
    hostname: os.hostname(),
  })
}
