export const dynamic = 'force-dynamic'

const MLX_PROXY_URL  = 'http://127.0.0.1:52415'   // cluster proxy (round-robin)
const MLX_MASTER_URL = 'http://127.0.0.1:52416'    // master backend (direct)
const MLX_WORKER_URL = 'http://192.168.100.2:52415' // worker backend (direct)
const LLAMA_URL      = 'http://127.0.0.1:8080'

export async function GET() {
  // --- MLX master (port 52416) ---
  let masterOk = false
  let masterModel = 'Llama-3.3-70B-Instruct-4bit'
  try {
    const r = await fetch(`${MLX_MASTER_URL}/health`, { signal: AbortSignal.timeout(3000) })
    masterOk = r.ok
  } catch { /* down */ }

  // --- MLX worker (192.168.100.2:52415) ---
  let workerOk = false
  try {
    const r = await fetch(`${MLX_WORKER_URL}/health`, { signal: AbortSignal.timeout(3000) })
    workerOk = r.ok
  } catch { /* down */ }

  // --- MLX cluster proxy (port 52415) ---
  let proxyOk = false
  try {
    const r = await fetch(`${MLX_PROXY_URL}/health`, { signal: AbortSignal.timeout(3000) })
    proxyOk = r.ok
  } catch { /* down */ }

  const mlxOk = proxyOk || masterOk || workerOk
  const nodeCount = (masterOk ? 1 : 0) + (workerOk ? 1 : 0)

  // --- llama-server (port 8080) ---
  let llamaOk = false
  let llamaModel = 'Holo3-35B-A3B-Q4_K_M'
  try {
    const r = await fetch(`${LLAMA_URL}/health`, { signal: AbortSignal.timeout(2000) })
    if (r.ok) {
      const d = await r.json()
      llamaOk = d.status === 'ok'
    }
  } catch { /* down */ }

  const nodes = []
  if (masterOk) nodes.push({ role: 'master', host: '127.0.0.1', type: 'Apple MLX (GPU)', allocGB: 37.0, backend: 'mlx_lm.server', ok: true, port: 52416 })
  if (workerOk) nodes.push({ role: 'worker', host: '192.168.100.2', type: 'Apple MLX (GPU)', allocGB: 37.0, backend: 'mlx_lm.server', ok: true, port: 52415 })
  if (!masterOk && !workerOk && llamaOk) nodes.push({ role: 'server', host: '127.0.0.1', type: 'Metal (GPU)', allocGB: 17.0, backend: 'llama-server', ok: true, port: 8080 })

  const clusterStatus = mlxOk
    ? `${nodeCount} node${nodeCount !== 1 ? 's' : ''} · proxy ${proxyOk ? 'ok' : 'down'}`
    : llamaOk ? 'llama-server fallback' : 'unreachable'

  return Response.json({
    ts: Date.now(),
    server: {
      ok:           mlxOk || llamaOk,
      status:       clusterStatus,
      loadingModel: false,
      url:          mlxOk ? MLX_PROXY_URL : LLAMA_URL,
    },
    model: {
      name:          mlxOk ? masterModel : llamaModel,
      quant:         mlxOk ? '4bit' : 'Q4_K_M',
      file:          mlxOk ? `mlx-community/${masterModel}` : `${llamaModel}.gguf`,
      sizeGB:        mlxOk ? 37.0 : 17.0,
      ctxTokens:     mlxOk ? 131072 : 32768,
      kvCache:       mlxOk ? 'MLX' : 'llama.cpp',
      kvCompression: mlxOk ? 'n/a' : 'q8_0',
      flashAttn:     mlxOk,
      threads:       mlxOk ? 0 : 8,
      parallel:      1,
    },
    throughput: {
      promptTps: 0, generateTps: 0,
      totalPromptTokens: 0, totalGenTokens: 0,
      requestsProcessing: 0, requestsDeferred: 0,
    },
    kvCache: {
      usageRatio: 0, tokens: 0,
      type:        mlxOk ? 'MLX' : 'llama.cpp',
      compression: mlxOk ? 'n/a' : 'q8_0',
      ctxMax:      mlxOk ? 131072 : 32768,
    },
    rpc: {
      ok:        workerOk,
      worker:    workerOk ? 'erel_worker' : 'n/a',
      port:      workerOk ? 52415 : 0,
      latencyMs: workerOk ? 0.4 : null,
    },
    nodes,
    cluster: {
      engine:       mlxOk ? 'mlx_lm.server' : 'llama-server',
      version:      mlxOk ? 'standalone-lb' : 'TurboQuant',
      port:         mlxOk ? 52415 : 8080,
      threads:      mlxOk ? 0 : 8,
      gpuLayers:    80,
      totalGB:      mlxOk ? 37.0 * nodeCount : 17.0,
      worldSize:    mlxOk ? nodeCount : 1,
      instanceType: mlxOk ? 'mlx_lm.server' : 'standalone',
    },
  })
}
