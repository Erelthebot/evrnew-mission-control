'use client'

import { useState } from 'react'

export default function FbAdsPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>('')

  const runMonitor = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/fb-ads-monitor', { method: 'POST' })
      const data = await res.json()
      setResult(data.output || 'No output')
    } catch (e: any) {
      setResult('Error: ' + e.message)
    }
    setLoading(false)
  }

  return (
    <div className="px-5 py-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[10px] tracking-[3px] uppercase font-bold mb-1 text-sky-600">Facebook Ads</h1>
          <p className="text-slate-500 text-xs">Evrnew LLC • Account act_652152434330613</p>
        </div>
        <button
          onClick={runMonitor}
          disabled={loading}
          className="text-[10px] border border-sky-300 text-sky-600 px-4 py-1.5 rounded-lg hover:bg-sky-50 disabled:opacity-50"
        >
          {loading ? 'Running...' : '↻ Refresh Now'}
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="font-semibold text-emerald-700">New Leads Campaign</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">ACTIVE</span>
        </div>

        <div className="text-sm text-slate-600 mb-4">
          Objective: OUTCOME_LEADS<br />
          Status: Active and receiving traffic
        </div>

        <div className="text-xs text-slate-500">
          Last checked: Daily at 6:00 AM via cron<br />
          Full insights available in fb_ads_monitor.py logs
        </div>
      </div>

      {result && (
        <pre className="mt-6 bg-slate-900 text-emerald-400 p-4 rounded-xl text-xs overflow-auto">
          {result}
        </pre>
      )}
    </div>
  )
}
