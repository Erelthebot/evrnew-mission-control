'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const nav = [
  {
    group: 'MAIN',
    items: [
      { href: '/', label: 'Overview', icon: '⬡' },
    ],
  },
  {
    group: 'MARKETING',
    items: [
      { href: '/marketing', label: 'Marketing Monitor', icon: '◆' },
      { href: '/strategy', label: 'Strategy', icon: '◈' },
      { href: "/competitive", label: "Competitive", icon: "◎" },
      { href: "/blog", label: "Blog / SEO", icon: "✎" },
      { href: '/social', label: 'Social', icon: '⊞' },
    ],
  },
  {
    group: 'OPERATIONS',
    items: [
      { href: '/operations', label: 'Operations', icon: '⬡' },
      { href: '/ads', label: 'Google Ads', icon: '◆' },
      { href: '/email-drip', label: 'Email Drip', icon: '≈' },
      { href: '/tasks', label: 'Tasks', icon: '▦' },
    ],
  },
  {
    group: 'KNOWLEDGE',
    items: [
      { href: '/memory', label: 'Memory', icon: '◎' },
      { href: '/activity', label: 'Activity Feed', icon: '≈' },
    ],
  },
  {
    group: 'TEAM',
    items: [
      { href: '/team', label: 'Team', icon: '◉' },
      { href: '/office', label: 'Office', icon: '⊞' },
    ],
  },
  {
    group: 'SYSTEM',
    items: [
      { href: '/system', label: 'System Status', icon: '◬' },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-52 shrink-0 flex flex-col bg-white border-r border-slate-200 h-screen overflow-y-auto">
      {/* Brand */}
      <div className="px-4 pt-5 pb-4 border-b border-slate-200">
        <div className="text-sky-600 text-xs font-bold tracking-widest uppercase mb-0.5">
          EVRNEW
        </div>
        <div className="text-slate-500 text-[10px] tracking-wide">Mission Control</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-4">
        {nav.map((group) => (
          <div key={group.group}>
            <div className="px-2 mb-1 text-[9px] tracking-widest text-slate-400 uppercase font-bold">
              {group.group}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`
                        flex items-center gap-2.5 px-2 py-1.5 rounded text-[12px] transition-colors
                        ${isActive
                          ? 'bg-gradient-to-r from-sky-50 to-violet-50 text-sky-600 border-l-2 border-sky-500 pl-[6px] shadow-sm'
                          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                        }
                      `}
                    >
                      <span className="text-[11px] shrink-0">{item.icon}</span>
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom system info */}
      <div className="px-4 py-3 border-t border-slate-200 space-y-2.5">
        {/* Status row */}
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-pulse shrink-0" />
          <span className="text-[10px] font-semibold text-slate-600">erel.local — M4 Pro</span>
        </div>

        {/* Hardware */}
        <div className="space-y-0.5">
          <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Hardware</p>
          <p className="text-[10px] text-slate-500">Mac Mini M4 Pro</p>
          <p className="text-[10px] text-slate-400">macOS Sequoia 15 (Darwin 25.3)</p>
          <p className="text-[10px] text-slate-400">926 GB · 11 GB used</p>
          <p className="text-[10px] text-slate-400">Auto-login · Auto-restart</p>
        </div>

        {/* Identity */}
        <div className="space-y-0.5">
          <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Identity</p>
          <p className="text-[10px] text-slate-500">erel@evrnew.com</p>
          <p className="text-[10px] text-slate-400">Passwordless sudo</p>
          <p className="text-[10px] text-slate-400 font-mono">ssh erel@erel.local</p>
          <p className="text-[10px] text-slate-400">Claude Code: unrestricted</p>
          <p className="text-[10px] text-slate-400">Full admin</p>
        </div>

        {/* Agents + site */}
        <div className="space-y-0.5 pt-0.5 border-t border-slate-100">
          <p className="text-[10px] text-emerald-600 font-medium">CrewAI · 8 agents running</p>
          <p className="text-[10px] text-slate-400">openclaw-evrnew.netlify.app</p>
        </div>
      </div>
    </aside>
  )
}
