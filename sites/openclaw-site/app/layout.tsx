import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/layout/Sidebar'

export const metadata: Metadata = {
  title: 'EREL.AI — Mission Control',
  description: 'EVRNEW LLC Internal Operating System — AI-powered insulation operations',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0d0d0d] text-[#e8e8e8] font-mono antialiased overflow-hidden h-screen">
        <div className="flex h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            {/* Top header */}
            <header className="shrink-0 border-b border-[#2a2a2a] px-5 py-2.5 flex items-center justify-between bg-[#0d0d0d] z-10">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-[#00e5ff] font-bold text-base tracking-tight shrink-0">
                  EREL<span className="text-[#7c3aed]">.AI</span>
                </span>
                <span className="text-[#333] shrink-0">|</span>
                <span className="text-[#444] text-[11px] leading-tight hidden lg:block truncate">
                  Build the most automated insulation, restoration, and home performance operation in America &mdash; where every job is handled faster, cleaner, and more profitably through AI.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <span className="inline-flex items-center gap-1.5 bg-[#22c55e]/10 border border-[#22c55e]/25 text-[#22c55e] text-[10px] px-2.5 py-1 rounded-full tracking-wide">
                  <span className="w-1.5 h-1.5 bg-[#22c55e] rounded-full animate-pulse inline-block" />
                  LIVE
                </span>
                <span className="text-[#333] text-[10px] hidden md:block">erel@evrnew.com</span>
              </div>
            </header>

            {/* Scrollable content */}
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}
