'use client'

import { useEffect, useState, useCallback } from 'react'

interface Integration {
  name: string
  purpose: string
  category: string
  status: 'active' | 'pending' | 'blocked' | 'error'
  note?: string
}

interface StatusResponse {
  integrations: Integration[]
  summary: { active: number; pending: number; blocked: number; total: number }
  checkedAt: string
}

const POLL_MS = 60_000 // 1 minute

function statusStyle(status: Integration['status']) {
  if (status === 'active')  return { color: '#16a34a', label: '✓ Active' }
  if (status === 'blocked') return { color: '#dc2626', label: '✗ Blocked' }
  if (status === 'pending') return { color: '#d97706', label: '⚠ Pending' }
  return { color: '#94a3b8', label: '— Unknown' }
}

const CATEGORIES = ['AI', 'SEO', 'Ads', 'Infra', 'Comms', 'CRM', 'Misc']

export default function IntegrationsTable() {
  const [data, setData]       = useState<StatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [filter, setFilter]   = useState<string>('All')

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/integration-status', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStatus() }, [fetchStatus])
  useEffect(() => {
    const t = setInterval(fetchStatus, POLL_MS)
    return () => clearInterval(t)
  }, [fetchStatus])

  const all = data?.integrations ?? []
  const shown = filter === 'All' ? all : all.filter(i => i.category === filter)
  const s = data?.summary

  return (
    <div>
      {/* Summary + controls */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex gap-3 text-xs flex-wrap">
          {s && <>
            <span className="text-emerald-600 font-medium">✓ {s.active} active</span>
            {s.pending > 0 && <span className="text-amber-500 font-medium">⚠ {s.pending} pending</span>}
            {s.blocked > 0 && <span className="text-red-500 font-medium">✗ {s.blocked} blocked</span>}
            <span className="text-slate-400">{s.total} total</span>
          </>}
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          {data && <span className="text-slate-400">Updated {new Date(data.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
          <button onClick={fetchStatus} disabled={loading} className="px-2 py-0.5 rounded border border-slate-200 hover:border-slate-300 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-40">↻</button>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-1 flex-wrap mb-3">
        {['All', ...CATEGORIES].map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${filter === cat ? 'bg-sky-50 border-sky-300 text-sky-600' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {error && <div className="text-xs text-red-500 mb-2">Error: {error}</div>}

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              {['Integration', 'Category', 'Purpose', 'Status'].map(h => (
                <th key={h} className="text-left text-[10px] tracking-widest uppercase text-slate-400 pb-2 pr-4 border-b border-slate-200">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && all.length === 0
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2.5 pr-4"><div className="h-3 w-32 bg-slate-100 rounded animate-pulse" /></td>
                    <td className="py-2.5 pr-4"><div className="h-3 w-16 bg-slate-100 rounded animate-pulse" /></td>
                    <td className="py-2.5 pr-4"><div className="h-3 w-48 bg-slate-100 rounded animate-pulse" /></td>
                    <td className="py-2.5"><div className="h-3 w-16 bg-slate-100 rounded animate-pulse" /></td>
                  </tr>
                ))
              : shown.map(i => {
                  const st = statusStyle(i.status)
                  return (
                    <tr key={i.name} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 pr-4 text-slate-700 font-medium whitespace-nowrap">{i.name}</td>
                      <td className="py-2.5 pr-4">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{i.category}</span>
                      </td>
                      <td className="py-2.5 pr-4 text-slate-400 text-[11px]">
                        {i.purpose}
                        {i.note && i.status !== 'active' && <span className="block text-[10px] text-amber-500 mt-0.5">{i.note}</span>}
                      </td>
                      <td className="py-2.5 whitespace-nowrap">
                        <span className="text-xs font-medium" style={{ color: st.color }}>{st.label}</span>
                      </td>
                    </tr>
                  )
                })
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}
