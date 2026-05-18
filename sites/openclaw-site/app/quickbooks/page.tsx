'use client'

import { useEffect, useState } from 'react'

interface QBStatus {
  connected?: boolean
  companyName?: string
  realmId?: string
  tokenExpiry?: string
  lastSync?: string
}

export default function QuickBooksPage() {
  const [status, setStatus] = useState<QBStatus>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/financial/quickbooks-status')
      .then(r => r.json())
      .then(d => { setStatus(d); setLoading(false) })
      .catch(() => { setStatus({ connected: false }); setLoading(false) })
  }, [])

  const rows = [
    { label: 'Company',      value: status.companyName ?? 'Evrnew LLC' },
    { label: 'Realm ID',     value: status.realmId ?? '9130356013963916' },
    { label: 'Token expiry', value: status.tokenExpiry ?? '~100 days from last auth' },
    { label: 'Last sync',    value: status.lastSync ?? '—' },
  ]

  return (
    <div style={{ padding: '28px 32px', maxWidth: 800 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 }}>QuickBooks</h1>
        <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>OAuth connection · QuickBooks Online Production</p>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <span style={{ fontSize: 18, color: loading ? '#94a3b8' : status.connected !== false ? '#16a34a' : '#dc2626' }}>●</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
            {loading ? 'Checking connection…' : status.connected !== false ? 'Connected' : 'Not connected'}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map(r => (
            <div key={r.label} style={{ display: 'flex', gap: 12, fontSize: 12 }}>
              <span style={{ width: 120, color: '#94a3b8', flexShrink: 0 }}>{r.label}</span>
              <span style={{ color: '#334155', fontFamily: 'monospace' }}>{r.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 20px' }}>
        <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600, marginBottom: 10 }}>
          Re-authenticate
        </div>
        <code style={{ fontSize: 11, color: '#334155', display: 'block', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 12px' }}>
          node ~/evrnew-marketing/scripts/quickbooks/qb-auth.js connect
        </code>
        <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
          Tokens last ~100 days. Re-run if API calls return 401.
        </p>
      </div>
    </div>
  )
}
