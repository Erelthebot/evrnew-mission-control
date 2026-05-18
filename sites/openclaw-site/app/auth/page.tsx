'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const [secret, setSecret] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret }),
    })
    setLoading(false)
    if (res.ok) {
      window.location.href = '/'
    } else {
      setError('Access denied')
      setSecret('')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f0f4ff', fontFamily: 'system-ui, sans-serif',
    }}>
      <form onSubmit={submit} style={{
        background: '#ffffff', border: '1px solid #c7d7f5', borderRadius: 12,
        padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 340,
        boxShadow: '0 4px 24px rgba(30, 80, 200, 0.10)',
      }}>
        <div style={{ color: '#1e50c8', fontSize: '1.3rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Erel Mission Control</div>
        <div style={{ color: '#6b7eb5', fontSize: '0.85rem' }}>Enter access secret</div>
        <input
          type="password"
          value={secret}
          onChange={e => setSecret(e.target.value)}
          autoFocus
          placeholder="secret"
          style={{
            background: '#f5f8ff', border: '1px solid #c7d7f5', borderRadius: 6,
            color: '#1a2a5e', padding: '0.6rem 0.8rem', fontSize: '0.9rem', outline: 'none',
          }}
        />
        {error && <div style={{ color: '#e03535', fontSize: '0.8rem' }}>{error}</div>}
        <button
          type="submit"
          disabled={loading || !secret}
          style={{
            background: loading ? '#a0b4e8' : '#1e50c8', color: '#fff', border: 'none',
            borderRadius: 6, padding: '0.65rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem',
          }}
        >
          {loading ? 'Verifying...' : 'Enter'}
        </button>
      </form>
    </div>
  )
}
