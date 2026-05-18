'use client'
import { useState, useEffect } from 'react'

export default function TopBar() {
  const [clock, setClock] = useState('')
  const [gatewayOk, setGatewayOk] = useState<boolean | null>(null)

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('en-US', { hour12: false }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch('/api/gateway-health', { cache: 'no-store' })
        const d = await r.json()
        setGatewayOk(d.ok)
      } catch { setGatewayOk(false) }
    }
    check()
    const id = setInterval(check, 10000)
    return () => clearInterval(id)
  }, [])

  return (
    <header id="top-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', background: 'linear-gradient(135deg,#0ea5e9,#7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textTransform: 'uppercase' }}>
          Mission Control
        </span>
        <span style={{ color: '#e2e8f0', fontSize: 10 }}>|</span>
        <span style={{ fontSize: 10, color: '#94a3b8' }}>
          EREL.AI · Evrnew LLC · MacBook Pro M5 Pro
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: gatewayOk === null ? '#cbd5e1' : gatewayOk ? '#22c55e' : '#ef4444', display: 'inline-block', animation: gatewayOk ? 'pulse 2s infinite' : 'none' }} />
          <span style={{ fontSize: 9, color: '#94a3b8', letterSpacing: '0.08em' }}>
            {gatewayOk === null ? 'CHECKING' : gatewayOk ? 'GATEWAY UP' : 'GATEWAY DOWN'}
          </span>
        </div>

        <span style={{ color: '#e2e8f0' }}>|</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '3px 8px' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 9, color: '#16a34a', letterSpacing: '0.08em', fontWeight: 600 }}>LIVE</span>
        </div>

        <span style={{ fontSize: 11, color: '#334155', fontWeight: 600, letterSpacing: '0.05em', minWidth: 70, textAlign: 'right' }}>
          {clock}
        </span>
      </div>
    </header>
  )
}
