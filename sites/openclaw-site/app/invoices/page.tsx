'use client'

import { useEffect, useState } from 'react'

interface Invoice {
  id: string
  docNumber: string
  customerName: string
  amount: number
  balance: number
  dueDate: string
  status: 'Open' | 'Paid' | 'Overdue'
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'All' | 'Open' | 'Overdue' | 'Paid'>('All')

  useEffect(() => {
    fetch('/api/financial/invoices')
      .then(r => r.json())
      .then(d => { setInvoices(d.invoices ?? []); setLoading(false) })
      .catch(() => { setError('Could not load invoices'); setLoading(false) })
  }, [])

  const fmt = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2 })

  const statusStyle: Record<string, { color: string; bg: string }> = {
    Open:    { color: '#0ea5e9', bg: '#f0f9ff' },
    Paid:    { color: '#16a34a', bg: '#f0fdf4' },
    Overdue: { color: '#dc2626', bg: '#fef2f2' },
  }

  const filtered = filter === 'All' ? invoices : invoices.filter(i => i.status === filter)
  const totalOpen = invoices.filter(i => i.status === 'Open' || i.status === 'Overdue').reduce((s, i) => s + i.balance, 0)

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1000 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 }}>Invoices</h1>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>QuickBooks Online · Evrnew LLC</p>
        </div>
        {!loading && !error && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Outstanding</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b' }}>{fmt(totalOpen)}</div>
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {(['All', 'Open', 'Overdue', 'Paid'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            fontSize: 11, padding: '4px 12px', borderRadius: 20, border: '1px solid',
            cursor: 'pointer', fontWeight: filter === f ? 600 : 400,
            background: filter === f ? '#0f172a' : '#fff',
            color: filter === f ? '#fff' : '#64748b',
            borderColor: filter === f ? '#0f172a' : '#e2e8f0',
          }}>
            {f}
          </button>
        ))}
      </div>

      {loading && <div style={{ color: '#94a3b8', fontSize: 13 }}>Loading invoices…</div>}

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: '#dc2626', fontSize: 13 }}>
          {error} — QuickBooks token may need refresh
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div style={{ color: '#94a3b8', fontSize: 13 }}>No {filter !== 'All' ? filter.toLowerCase() + ' ' : ''}invoices found.</div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Invoice #', 'Customer', 'Amount', 'Balance', 'Due Date', 'Status'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv, i) => {
                const s = statusStyle[inv.status]
                return (
                  <tr key={inv.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <td style={{ padding: '10px 14px', color: '#0ea5e9', fontFamily: 'monospace' }}>{inv.docNumber}</td>
                    <td style={{ padding: '10px 14px', color: '#334155' }}>{inv.customerName}</td>
                    <td style={{ padding: '10px 14px', color: '#334155' }}>{fmt(inv.amount)}</td>
                    <td style={{ padding: '10px 14px', color: inv.balance > 0 ? '#f59e0b' : '#16a34a', fontWeight: 600 }}>{fmt(inv.balance)}</td>
                    <td style={{ padding: '10px 14px', color: '#64748b' }}>{inv.dueDate}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: s.bg, color: s.color }}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
