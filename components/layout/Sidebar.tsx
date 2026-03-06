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
    group: 'OPERATIONS',
    items: [
      { href: '/tasks', label: 'Task Board', icon: '▦' },
      { href: '/calendar', label: 'Calendar', icon: '◫' },
      { href: '/projects', label: 'Projects', icon: '◈' },
      { href: '/documents', label: 'Documents', icon: '◻' },
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
    <aside className="w-52 shrink-0 flex flex-col bg-[#0d0d0d] border-r border-[#2a2a2a] h-screen overflow-y-auto">
      {/* Brand */}
      <div className="px-4 pt-5 pb-4 border-b border-[#2a2a2a]">
        <div className="text-[#00e5ff] text-xs font-bold tracking-widest uppercase mb-0.5">
          EVRNEW
        </div>
        <div className="text-[#444] text-[10px] tracking-wide">Mission Control</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-4">
        {nav.map((group) => (
          <div key={group.group}>
            <div className="px-2 mb-1 text-[9px] tracking-widest text-[#333] uppercase font-bold">
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
                          ? 'bg-[#00e5ff]/8 text-[#00e5ff] border-l-2 border-[#00e5ff] pl-[6px]'
                          : 'text-[#666] hover:text-[#aaa] hover:bg-[#ffffff06]'
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
      <div className="px-4 py-3 border-t border-[#2a2a2a] space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-[#22c55e] rounded-full inline-block" />
          <span className="text-[10px] text-[#444]">erel.local — M4 Pro</span>
        </div>
        <div className="text-[10px] text-[#333]">CrewAI · 8 agents running</div>
        <div className="text-[10px] text-[#333]">openclaw-evrnew.netlify.app</div>
      </div>
    </aside>
  )
}
