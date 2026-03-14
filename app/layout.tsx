import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/layout/Sidebar'
import ChatWidget from '@/components/ChatWidget'

export const metadata: Metadata = {
  title: 'EREL.AI — Mission Control',
  description: 'EVRNEW LLC Internal Operating System — AI-powered insulation operations',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div id="app-shell">
          <Sidebar />
          <div id="main-col">
            <header id="top-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, overflow: 'hidden' }}>
                <span style={{
                  fontWeight: 700,
                  fontSize: 15,
                  letterSpacing: '-0.02em',
                  flexShrink: 0,
                  background: 'linear-gradient(135deg,#0ea5e9,#7c3aed)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  EREL.AI
                </span>
                <span style={{ color: '#94a3b8', flexShrink: 0 }}>|</span>
                <span style={{ color: '#64748b', fontSize: 11, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Build the most automated insulation, restoration, and home performance operation in America ... where every job is handled faster, cleaner, and more profitably through AI.
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 12 }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#f0fdf4',
                  border: '1px solid #4ade80',
                  color: '#16a34a',
                  fontSize: 10,
                  padding: '4px 10px',
                  borderRadius: 999,
                  letterSpacing: '0.05em'
                }}>
                  <span style={{
                    width: 6,
                    height: 6,
                    background: '#22c55e',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'pulse 2s infinite'
                  }} />
                  LIVE
                </span>
                <span style={{ color: '#94a3b8', fontSize: 10 }}>erel@evrnew.com</span>
              </div>
            </header>
            <main id="scroll-area">
              {children}
            </main>
          </div>
        </div>
        <ChatWidget />
      </body>
    </html>
  )
}
