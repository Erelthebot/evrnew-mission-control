'use client'

import { useState, useEffect } from 'react'

type AdsSummary = {
  fetchedAt: string
  dateRange: { start: string; end: string }
  customerId: string
  totals: {
    spend: number
    impressions: number
    clicks: number
    conversions: number
    ctr: number
    cpc: number
  }
  campaigns: {
    id: string
    name: string
    type: string
    cost: number
    impressions: number
    clicks: number
    conversions: number
    ctr: number
  }[]
  error?: string
  missing?: string[]
}

const TYPE_LABEL: Record<string, string> = {
  SEARCH: 'Search',
  DISPLAY: 'Display',
  VIDEO: 'Video',
  PERFORMANCE_MAX: 'PMax',
  SHOPPING: 'Shopping',
}

const TYPE_COLOR: Record<string, string> = {
  SEARCH: '#0ea5e9',
  DISPLAY: '#7c3aed',
  VIDEO: '#ec4899',
  PERFORMANCE_MAX: '#f59e0b',
  SHOPPING: '#10b981',
}

function fmt(n: number) {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K`
    : String(n)
}

export default function AdsPage() {
  const [data, setData] = useState<AdsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/google-ads')
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error + (d.missing ? `\nMissing: ${d.missing.join(', ')}` : ''))
        else setData(d)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="px-5 py-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[10px] tracking-[3px] uppercase font-bold mb-1 text-sky-600">Google Ads</h1>
          <p className="text-slate-500 text-xs">
            {data ? `Last 30 days · ${data.dateRange.start} → ${data.dateRange.end} · ID ${data.customerId}` : 'Live campaign performance'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <span className="text-[10px] text-slate-400">
              Updated {new Date(data.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => { setLoading(true); setError(null); fetch('/api/google-ads').then(r => r.json()).then(d => { if (d.error) setError(d.error); else setData(d); }).finally(() => setLoading(false)) }}
            className="text-[10px] border border-sky-300 text-sky-600 px-3 py-1 rounded-lg hover:bg-sky-50 transition-colors"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24">
          <div className="space-y-3 text-center">
            <div className="w-8 h-8 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-slate-400 text-sm">Fetching Google Ads data…</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-5">
          <p className="text-red-700 font-semibold text-sm mb-1">Google Ads API error</p>
          <pre className="text-red-600 text-xs whitespace-pre-wrap">{error}</pre>
          <p className="text-slate-500 text-xs mt-3">Make sure all 5 env vars are set in Netlify: <code className="bg-red-100 px-1 rounded">GOOGLE_ADS_CLIENT_ID</code>, <code className="bg-red-100 px-1 rounded">GOOGLE_ADS_CLIENT_SECRET</code>, <code className="bg-red-100 px-1 rounded">GOOGLE_ADS_REFRESH_TOKEN</code>, <code className="bg-red-100 px-1 rounded">GOOGLE_ADS_DEVELOPER_TOKEN</code>, <code className="bg-red-100 px-1 rounded">GOOGLE_ADS_CUSTOMER_ID</code></p>
        </div>
      )}

      {data && (
        <>
          {/* Stat tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Spend', value: `$${data.totals.spend.toLocaleString()}`, color: '#0ea5e9', bg: '#e0f2fe', border: '#0ea5e9' },
              { label: 'Impressions', value: fmt(data.totals.impressions), color: '#7c3aed', bg: '#f5f3ff', border: '#7c3aed' },
              { label: 'Clicks', value: fmt(data.totals.clicks), color: '#16a34a', bg: '#f0fdf4', border: '#16a34a' },
              { label: 'Conversions', value: String(data.totals.conversions), color: '#ea580c', bg: '#fff7ed', border: '#ea580c' },
              { label: 'CTR', value: `${data.totals.ctr}%`, color: '#db2777', bg: '#fdf2f8', border: '#db2777' },
              { label: 'Avg CPC', value: `$${data.totals.cpc}`, color: '#ca8a04', bg: '#fefce8', border: '#ca8a04' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-4 border-2" style={{ background: s.bg, borderColor: s.border }}>
                <p className="text-[9px] tracking-widest uppercase font-semibold mb-1" style={{ color: s.color }}>{s.label}</p>
                <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Campaign table */}
          <div>
            <h2 className="text-[10px] tracking-[3px] uppercase font-bold mb-3 pb-2 border-b-2 text-sky-600 border-slate-200">
              Active Campaigns ({data.campaigns.length})
            </h2>
            <div className="rounded-xl border-2 border-slate-200 overflow-hidden">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    {['Campaign', 'Type', 'Spend', 'Impressions', 'Clicks', 'Conv.', 'CTR'].map(h => (
                      <th key={h} className="text-left text-[10px] tracking-widest uppercase text-slate-500 px-4 py-3 border-b border-slate-200 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.campaigns.map((c, i) => {
                    const color = TYPE_COLOR[c.type] ?? '#64748b'
                    const maxSpend = Math.max(...data.campaigns.map(x => x.cost))
                    const barPct = maxSpend > 0 ? (c.cost / maxSpend) * 100 : 0
                    return (
                      <tr key={c.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${i === data.campaigns.length - 1 ? 'border-0' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden shrink-0">
                              <div className="h-full rounded-full" style={{ width: `${barPct}%`, background: color }} />
                            </div>
                            <span className="text-slate-800 font-medium truncate max-w-[200px]">{c.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-medium border" style={{ color, background: color + '15', borderColor: color + '40' }}>
                            {TYPE_LABEL[c.type] ?? c.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800">${c.cost.toLocaleString()}</td>
                        <td className="px-4 py-3 text-slate-600">{c.impressions.toLocaleString()}</td>
                        <td className="px-4 py-3 text-slate-600">{c.clicks.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={c.conversions > 0 ? 'text-emerald-700 font-semibold' : 'text-slate-400'}>{c.conversions}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{c.ctr}%</td>
                      </tr>
                    )
                  })}
                  {data.campaigns.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">No active campaigns in this period</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
