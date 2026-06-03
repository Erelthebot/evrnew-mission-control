'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const nav = [
  { group: 'MAIN', items: [
    { href: '/',           label: 'Mission Control', icon: '◈' },
  ]},
  { group: 'OPERATIONS', items: [
    { href: '/operations', label: 'Operations',       icon: '⬡' },
  ]},
  { group: 'FINANCIAL', items: [
    { href: '/financial',  label: 'Financial Overview', icon: '◈' },
    { href: '/invoices',   label: 'Invoices',           icon: '▦' },
  ]},
  { group: 'SYSTEM', items: [
    { href: '/system',     label: 'System',             icon: '◬' },
  ]},
  { group: 'MARKETING', items: [
    { href: '/ghl',        label: 'Pipeline & Leads',   icon: '◎' },
    { href: '/marketing',  label: 'Marketing',          icon: '◆' },
    { href: '/strategy',   label: 'Strategy',           icon: '◎' },
    { href: '/competitive',label: 'Competitive',        icon: '◬' },
    { href: '/blog',       label: 'Blog / SEO',         icon: '✎' },
    { href: '/social',     label: 'Social',             icon: '⊞' },
    { href: '/ads',        label: 'Google Ads',         icon: '◆' },
    { href: '/fb-ads',     label: 'Facebook Ads',       icon: '◆' },
    { href: '/email-drip', label: 'Email Drip',         icon: '≈' },
    { href: '/memory',     label: 'Memory',             icon: '◉' },
  ]},
]

export default function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const toggleSidebar = () => setIsOpen(!isOpen)

  const toggleGroup = (group: string) => {
    setCollapsed(prev => ({ ...prev, [group]: !prev[group] }))
  }

  return (
    <>
      <button className="hamburger-btn" onClick={toggleSidebar}>
        {isOpen ? '✕' : '☰'}
      </button>
      {isOpen && <div className="sidebar-overlay" onClick={toggleSidebar} />}
      <aside
        className={`sidebar-drawer${isOpen ? ' open' : ''}`}
        style={{
          width: 188,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          borderRight: '1px solid #e2e8f0',
          height: '100vh',
          overflowY: 'auto',
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
          {nav.map((group) => {
            const isCollapsed = collapsed[group.group] ?? false
            const hasActive = group.items.some(item =>
              pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            )
            return (
              <div key={group.group}>
                <button
                  onClick={() => toggleGroup(group.group)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                    padding: '0 6px', marginBottom: isCollapsed ? 0 : 3,
                  }}
                >
                  <span style={{ fontSize: 8, letterSpacing: '0.2em', color: hasActive ? '#0ea5e9' : '#cbd5e1', textTransform: 'uppercase', fontWeight: 700 }}>
                    {group.group}
                  </span>
                  <span style={{ fontSize: 8, color: '#cbd5e1', lineHeight: 1 }}>
                    {isCollapsed ? '▸' : '▾'}
                  </span>
                </button>
                {!isCollapsed && (
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
                )}
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="dot-live" />
            <span style={{ fontSize: 10, color: '#334155', fontWeight: 600 }}>erel.local</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 9, color: '#94a3b8' }}>MacBook Pro M5 Pro · macOS 26</span>
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
