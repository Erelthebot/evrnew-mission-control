'use client'

import { useEffect, useState } from 'react'

interface QBSummary {
  revenue?: number
  expenses?: number
  netIncome?: number
  accountsReceivable?: number
  accountsPayable?: number
  cashOnHand?: number
  plPeriod?: { start: string; end: string }
  asOf?: string
}

export default function FinancialPage() {
  const [summary, setSummary] = useState<QBSummary>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/financial/summary')
      .then(r => r.json())
      .then(d => { setSummary(d); setLoading(false) })
      .catch(() => { setError('QuickBooks data unavailable'); setLoading(false) })
  }, [])

  const fmt = (n?: number) =>
    n != null ? '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '—'

  const cards = [
    { label: 'Revenue (MTD)',        value: fmt(summary.revenue),           color: '#16a34a' },
    { label: 'Expenses (MTD)',       value: fmt(summary.expenses),          color: '#dc2626' },
    { label: 'Net Income (MTD)',     value: fmt(summary.netIncome),         color: (summary.netIncome ?? 0) >= 0 ? '#0ea5e9' : '#dc2626' },
    { label: 'Accounts Receivable', value: fmt(summary.accountsReceivable), color: '#f59e0b' },
    { label: 'Accounts Payable',    value: fmt(summary.accountsPayable),    color: '#ef4444' },
    { label: 'Cash on Hand',        value: fmt(summary.cashOnHand),         color: '#7c3aed' },
  ]

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 }}>Financial Overview</h1>
        <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
          QuickBooks Online · Evrnew LLC · Realm 9130356013963916
          {summary.plPeriod && <span> · MTD {summary.plPeriod.start} → {summary.plPeriod.end}</span>}
          {summary.asOf && <span> · cached {summary.asOf}</span>}
        </p>
      </div>

      {loading && (
        <div style={{ color: '#94a3b8', fontSize: 13 }}>Loading QuickBooks data...</div>
      )}

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: '#dc2626', fontSize: 13, marginBottom: 20 }}>
          {error} — connect via <code style={{ fontSize: 11 }}>node ~/evrnew-marketing/scripts/quickbooks/qb-auth.js connect</code>
        </div>
      )}

      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
          {cards.map(c => (
            <div key={c.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '18px 20px' }}>
              <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600, marginBottom: 8 }}>
                {c.label}
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: c.color, letterSpacing: '-0.02em' }}>
                {c.value}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '18px 20px' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600, marginBottom: 12 }}>
            Quick Links
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'QuickBooks Online', href: 'https://app.qbo.intuit.com/' },
              { label: 'Open Invoices', href: '/invoices' },
              { label: 'QuickBooks Sync', href: '/quickbooks' },
            ].map(l => (
              <a key={l.label} href={l.href} target={l.href.startsWith('http') ? '_blank' : undefined}
                style={{ fontSize: 12, color: '#0ea5e9', textDecoration: 'none' }}>
                → {l.label}
              </a>
            ))}
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '18px 20px' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600, marginBottom: 12 }}>
            Integration Status
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { label: 'QuickBooks OAuth', status: error ? 'error' : 'ok' },
              { label: 'Realm ID', status: 'ok', detail: '9130356013963916' },
              { label: 'Token file', status: 'ok', detail: 'qb-tokens.json' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                <span style={{ color: s.status === 'ok' ? '#16a34a' : '#dc2626' }}>
                  {s.status === 'ok' ? '●' : '○'}
                </span>
                <span style={{ color: '#334155' }}>{s.label}</span>
                {s.detail && <span style={{ color: '#94a3b8' }}>{s.detail}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
