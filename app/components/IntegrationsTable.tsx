'use client'

import { useEffect, useState, useCallback } from 'react'

interface Integration {
  name: string
  purpose: string
  status: 'active' | 'pending' | 'error'
  note?: string
}

interface StatusResponse {
  integrations: Integration[]
  summary: { active: number; pending: number; total: number }
  checkedAt: string
}

const POLL_INTERVAL_MS = 15 * 60 * 1000 // 15 minutes

function statusLabel(i: Integration) {
  if (i.status === 'active') return '✓ Active'
  if (i.status === 'pending') return `⚠ ${i.note ?? 'Pending'}`
  return '✗ Error'
}

function statusColor(status: Integration['status']) {
  if (status === 'active') return 'text-emerald-600'
  if (status === 'pending') return 'text-amber-500'
  return 'text-red-600'
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '—'
  }
}

export default function IntegrationsTable() {
  const [data, setData] = useState<StatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(POLL_INTERVAL_MS / 1000)

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/integration-status.json')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: StatusResponse = await res.json()
      setData(json)
      setCountdown(POLL_INTERVAL_MS / 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // Poll every 5 minutes
  useEffect(() => {
    const interval = setInterval(fetchStatus, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchStatus])

  // Countdown ticker
  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? POLL_INTERVAL_MS / 1000 : prev - 1))
    }, 1000)
    return () => clearInterval(tick)
  }, [])

  const integrations = data?.integrations ?? []
  const summary = data?.summary

  return (
    <div>
      {/* Header bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-3 text-xs">
          {summary && (
            <>
              <span className="text-emerald-600 font-medium">✓ {summary.active} active</span>
              {summary.pending > 0 && (
                <span className="text-amber-500 font-medium">⚠ {summary.pending} pending</span>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          {loading && <span className="animate-pulse">Checking…</span>}
          {!loading && data && (
            <>
              <span>Updated {formatTime(data.checkedAt)}</span>
              <span>· next in {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}</span>
            </>
          )}
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="ml-1 px-2 py-0.5 rounded border border-slate-200 hover:border-slate-300 hover:text-slate-600 transition-colors disabled:opacity-40"
            title="Refresh now"
          >
            ↻
          </button>
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-500 mb-2">Could not reach status endpoint: {error}</div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              {['Integration', 'Purpose', 'Status'].map(h => (
                <th
                  key={h}
                  className="text-left text-[10px] tracking-widest uppercase text-slate-500 pb-3 pr-4 border-b border-slate-200"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && integrations.length === 0 ? (
              Array.from({ length: 8 }).map((_, idx) => (
                <tr key={idx} className="border-b border-[#ffffff04]">
                  <td className="py-2.5 pr-4"><div className="h-3 w-32 bg-slate-100 rounded animate-pulse" /></td>
                  <td className="py-2.5 pr-4"><div className="h-3 w-48 bg-slate-100 rounded animate-pulse" /></td>
                  <td className="py-2.5"><div className="h-3 w-16 bg-slate-100 rounded animate-pulse" /></td>
                </tr>
              ))
            ) : (
              integrations.map(i => (
                <tr key={i.name} className="border-b border-[#ffffff04] last:border-0">
                  <td className="py-2.5 pr-4 text-slate-600">{i.name}</td>
                  <td className="py-2.5 pr-4 text-slate-400">{i.purpose}</td>
                  <td className="py-2.5">
                    <span className={`text-xs font-medium ${statusColor(i.status)}`}>
                      {statusLabel(i)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
