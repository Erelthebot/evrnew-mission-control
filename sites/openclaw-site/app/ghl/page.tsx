'use client'

import { useEffect, useState } from 'react'

interface ByStage { count: number; value: number }
interface Lead { id: string; name: string; email?: string; phone?: string; source?: string; dateAdded?: string; tags?: string[] }
interface Convo { id: string; contactName: string; type: string; lastMessage: string; lastMessageDate: number; unreadCount: number }
interface GhlData {
  fetchedAt: string
  pipeline: {
    open: number; won: number; lost: number
    open_value: number; won_value: number; total_value: number
    win_rate: number
    by_stage: Record<string, ByStage>
    source_breakdown?: Record<string, number>
  }
  recentLeads: Lead[]
  recentConversations?: Convo[]
}

const SOURCE_COLORS: Record<string, string> = {
  Thumbtack: '#0ea5e9',
  D2D:        '#7c3aed',
  Referral:   '#16a34a',
  Social:     '#f59e0b',
  Google:     '#ef4444',
  'Google Ads': '#dc2626',
  Reddit:     '#f97316',
  Direct:     '#64748b',
  Manual:     '#94a3b8',
  QuickBooks: '#0ea5e9',
  Organic:    '#10b981',
  Other:      '#cbd5e1',
  Unknown:    '#e2e8f0',
}

function fmt$(n: number) {
  return '$' + Math.round(n).toLocaleString('en-US')
}

function relTime(ts: number | string) {
  const ms = typeof ts === 'number' ? ts : new Date(ts).getTime()
  const diff = Date.now() - ms
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago'
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago'
  return Math.floor(diff / 86400000) + 'd ago'
}

export default function GHLPage() {
  const [data, setData] = useState<GhlData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/ghl')
      .then(r => { if (!r.ok) throw new Error(r.status + ''); return r.json() })
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError('GHL data unavailable: ' + e.message); setLoading(false) })
  }, [])

  const p = data?.pipeline

  const maxStageVal = p ? Math.max(...Object.values(p.by_stage).map(s => s.value), 1) : 1
  const maxSrcCount = p?.source_breakdown ? Math.max(...Object.values(p.source_breakdown), 1) : 1

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 }}>Pipeline &amp; Leads</h1>
        <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
          GoHighLevel CRM · Evrnew LLC · Location 4DKapRFZCHMehBPjCKKU
          {data?.fetchedAt && <span> · cached {relTime(data.fetchedAt)}</span>}
        </p>
      </div>

      {loading && <div style={{ color: '#94a3b8', fontSize: 13 }}>Loading GHL data...</div>}

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', color: '#dc2626', fontSize: 13, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {p && (
        <>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            {[
              { label: 'Open Opps',    value: p.open,                      sub: fmt$(p.open_value),  color: '#0ea5e9' },
              { label: 'Won',          value: p.won,                       sub: fmt$(p.won_value),   color: '#16a34a' },
              { label: 'Lost',         value: p.lost,                      sub: '—',                 color: '#ef4444' },
              { label: 'Win Rate',     value: p.win_rate.toFixed(1) + '%', sub: fmt$(p.total_value) + ' total', color: '#7c3aed' },
            ].map(c => (
              <div key={c.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 18px' }}>
                <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600, marginBottom: 6 }}>
                  {c.label}
                </div>
                <div style={{ fontSize: 26, fontWeight: 700, color: c.color, letterSpacing: '-0.02em' }}>
                  {c.value}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{c.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {/* Stage breakdown */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '18px 20px' }}>
              <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600, marginBottom: 14 }}>
                Open by Stage
              </div>
              {Object.entries(p.by_stage).length === 0
                ? <div style={{ fontSize: 12, color: '#94a3b8' }}>No open opportunities</div>
                : Object.entries(p.by_stage).map(([stage, s]) => (
                  <div key={stage} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#334155', marginBottom: 3 }}>
                      <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stage}</span>
                      <span style={{ color: '#64748b' }}>{s.count} · {fmt$(s.value)}</span>
                    </div>
                    <div style={{ height: 5, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: (s.value / maxStageVal * 100) + '%', background: '#0ea5e9', borderRadius: 3 }} />
                    </div>
                  </div>
                ))
              }
            </div>

            {/* Source breakdown */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '18px 20px' }}>
              <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600, marginBottom: 14 }}>
                Lead Sources
              </div>
              {!p.source_breakdown || Object.entries(p.source_breakdown).length === 0
                ? <div style={{ fontSize: 12, color: '#94a3b8' }}>No source data</div>
                : Object.entries(p.source_breakdown).map(([src, count]) => (
                  <div key={src} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#334155', marginBottom: 3 }}>
                      <span>{src}</span>
                      <span style={{ color: '#64748b' }}>{count}</span>
                    </div>
                    <div style={{ height: 5, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: (count / maxSrcCount * 100) + '%', background: SOURCE_COLORS[src] ?? '#94a3b8', borderRadius: 3 }} />
                    </div>
                  </div>
                ))
              }
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Recent leads */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '18px 20px' }}>
              <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600, marginBottom: 14 }}>
                Recent Contacts
              </div>
              {data.recentLeads.length === 0
                ? <div style={{ fontSize: 12, color: '#94a3b8' }}>No recent contacts</div>
                : data.recentLeads.slice(0, 10).map(l => (
                  <div key={l.id} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 10, marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{l.name || 'Unknown'}</span>
                      {l.source && (
                        <span style={{ fontSize: 9, background: '#f0f9ff', color: SOURCE_COLORS[l.source] ?? '#0ea5e9', borderRadius: 4, padding: '2px 6px', fontWeight: 600 }}>
                          {l.source}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                      {l.email || l.phone || '—'}
                      {l.dateAdded && <span> · {relTime(l.dateAdded)}</span>}
                    </div>
                    {l.tags && l.tags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                        {l.tags.slice(0, 3).map(t => (
                          <span key={t} style={{ fontSize: 9, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 3, padding: '1px 5px', color: '#64748b' }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              }
            </div>

            {/* Recent conversations */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '18px 20px' }}>
              <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600, marginBottom: 14 }}>
                Recent Conversations
              </div>
              {!data.recentConversations || data.recentConversations.length === 0
                ? <div style={{ fontSize: 12, color: '#94a3b8' }}>No recent conversations</div>
                : data.recentConversations.map(c => (
                  <div key={c.id} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 10, marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{c.contactName}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {c.unreadCount > 0 && (
                          <span style={{ fontSize: 9, background: '#ef4444', color: '#fff', borderRadius: 10, padding: '1px 5px', fontWeight: 700 }}>
                            {c.unreadCount}
                          </span>
                        )}
                        <span style={{ fontSize: 10, color: '#94a3b8' }}>{relTime(c.lastMessageDate)}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>[{c.type || 'MSG'}] {c.lastMessage || '—'}</div>
                  </div>
                ))
              }
            </div>
          </div>
        </>
      )}
    </div>
  )
}
