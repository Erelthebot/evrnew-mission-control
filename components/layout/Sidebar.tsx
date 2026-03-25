'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const nav = [
  { group: 'MAIN', items: [
    { href: '/', label: 'Mission Control', icon: '◈' },
  ]},
  { group: 'MARKETING', items: [
    { href: '/marketing',   label: 'Marketing',   icon: '◆' },
    { href: '/strategy',    label: 'Strategy',    icon: '◎' },
    { href: '/competitive', label: 'Competitive', icon: '◬' },
    { href: '/blog',        label: 'Blog / SEO',  icon: '✎' },
    { href: '/social',      label: 'Social',      icon: '⊞' },
  ]},
  { group: 'OPERATIONS', items: [
    { href: '/operations', label: 'Operations',  icon: '⬡' },
    { href: '/ads',        label: 'Google Ads',  icon: '◆' },
    { href: '/email-drip', label: 'Email Drip',  icon: '≈' },
    { href: '/tasks',      label: 'Tasks',       icon: '▦' },
  ]},
  { group: 'KNOWLEDGE', items: [
    { href: '/memory',   label: 'Memory',        icon: '◎' },
    { href: '/activity', label: 'Activity Feed', icon: '≈' },
  ]},
  { group: 'SYSTEM', items: [
    { href: '/team',   label: 'Team',   icon: '◉' },
    { href: '/system', label: 'System', icon: '◬' },
  ]},
]

export default function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const toggleSidebar = () => {
    setIsOpen(!isOpen)
  }

  return (
    <>
      <button 
        onClick={toggleSidebar} 
        style={{ 
          display: 'none', 
          '@media (max-width: 768px)': { 
            display: 'block', 
            position: 'fixed', 
            top: 10, 
            left: 10, 
            zIndex: 20, 
            background: '#ffffff', 
            border: '1px solid #e2e8f0', 
            borderRadius: '4px', 
            padding: '5px 10px', 
            cursor: 'pointer' 
          } 
        }}
      >
        {isOpen ? 'Close' : 'Menu'}
      </button>
      <aside 
        style={{ 
          width: 188, 
          flexShrink: 0, 
          display: 'flex', 
          flexDirection: 'column', 
          background: '#ffffff', 
          borderRight: '1px solid #e2e8f0', 
          height: '100vh', 
          overflowY: 'auto',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 15,
          '@media (min-width: 769px)': {
            transform: 'translateX(0)',
            position: 'relative'
          }
        }}
      >
        {/* Brand */}
        <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #0ea5e9, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 2 }}>
            EREL.AI
          </div>
          <div style={{ fontSize: 8, letterSpacing: '0.15em', color: '#94a3b8', textTransform: 'uppercase' }}>
            Mission Control
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 6px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {nav.map((group) => (
            <div key={group.group}>
              <div style={{ fontSize: 8, letterSpacing: '0.2em', color: '#cbd5e1', textTransform: 'uppercase', fontWeight: 700, padding: '0 6px', marginBottom: 3 }}>
                {group.group}
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 1 }}>
                {group.items.map((item) => {
                  const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                  return (
                    <li key={item.href}>
                      <Link 
                        href={item.href} 
                        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 7px', borderRadius: 4, fontSize: 11, textDecoration: 'none', background: active ? '#f0f9ff' : 'transparent', color: active ? '#0ea5e9' : '#64748b', borderLeft: active ? '2px solid #0ea5e9' : '2px solid transparent', transition: 'all 0.15s' }} 
                        onClick={() => setIsOpen(false)}
                      >
                        <span style={{ fontSize: 9, opacity: 0.6 }}>{item.icon}</span>
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="dot-live" />
            <span style={{ fontSize: 10, color: '#334155', fontWeight: 600 }}>erel.local</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 9, color: '#94a3b8' }}>Mac Mini M4 Pro · macOS 15</span>
            <span style={{ fontSize: 9, color: '#94a3b8' }}>erel@evrnew.com</span>
          </div>
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 6 }}>
            <span style={{ fontSize: 9, color: '#16a34a', fontWeight: 600 }}>8 agents active</span>
          </div>
        </div>
      </aside>
    </>
  )
}
