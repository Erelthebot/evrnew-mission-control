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
      <body className="bg-white text-slate-900 font-mono antialiased overflow-hidden h-screen">
        <div className="flex h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            {/* Top header */}
            <header className="shrink-0 border-b border-slate-200 px-5 py-2.5 flex items-center justify-between bg-white z-10">
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-bold text-base tracking-tight shrink-0" style={{background:'linear-gradient(135deg,#0ea5e9,#7c3aed)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
                  EREL.AI
                </span>
                <span className="text-slate-400 shrink-0">|</span>
                <span className="text-slate-500 text-[11px] leading-tight hidden lg:block truncate">
                  Build the most automated insulation, restoration, and home performance operation in America &mdash; where every job is handled faster, cleaner, and more profitably through AI.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-400 text-emerald-600 text-[10px] px-2.5 py-1 rounded-full tracking-wide">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse inline-block" />
                  LIVE
                </span>
                <span className="text-slate-400 text-[10px] hidden md:block">erel@evrnew.com</span>
              </div>
            </header>

            {/* Scrollable content */}
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
        <ChatWidget />
      </body>
    </html>
  )
}
