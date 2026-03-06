// Office — 2D pseudo-pixel operations room.
// Visual representation of agents and team members at work.
// Lightweight, fun, and operationally meaningful.

import { teamMembers, activityLogs } from '@/lib/data'

// Office layout: zones with desks
const ZONES = [
  {
    id: 'sales',
    label: 'Sales Floor',
    color: '#a78bfa',
    bg: 'bg-[#7c3aed]/5 border-[#7c3aed]/15',
    desks: [
      { memberId: 'tm1', x: 0 }, // Johnny
      { memberId: 'tm9', x: 1 }, // Sales Agent
    ],
  },
  {
    id: 'ops',
    label: 'Operations Wing',
    color: '#00e5ff',
    bg: 'bg-[#00e5ff]/5 border-[#00e5ff]/15',
    desks: [
      { memberId: 'tm2', x: 0 }, // Misty
      { memberId: 'tm10', x: 1 }, // Ops Agent
      { memberId: 'tm13', x: 2 }, // Scheduling Agent
    ],
  },
  {
    id: 'field',
    label: 'Field Crew',
    color: '#22c55e',
    bg: 'bg-[#22c55e]/5 border-[#22c55e]/15',
    desks: [
      { memberId: 'tm3', x: 0 }, // Clint
      { memberId: 'tm5', x: 1 }, // AJ
      { memberId: 'tm6', x: 2 }, // Ana
      { memberId: 'tm7', x: 3 }, // Oscar
    ],
  },
  {
    id: 'finance',
    label: 'Finance & Admin',
    color: '#60a5fa',
    bg: 'bg-[#60a5fa]/5 border-[#60a5fa]/15',
    desks: [
      { memberId: 'tm4', x: 0 }, // Diane
      { memberId: 'tm11', x: 1 }, // Finance Agent
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing Wing',
    color: '#f472b6',
    bg: 'bg-[#f472b6]/5 border-[#f472b6]/15',
    desks: [
      { memberId: 'tm12', x: 0 }, // Marketing Agent
      { memberId: 'tm15', x: 1 }, // Documentation Agent
    ],
  },
  {
    id: 'hr',
    label: 'HR & Recruiting',
    color: '#facc15',
    bg: 'bg-[#facc15]/5 border-[#facc15]/15',
    desks: [
      { memberId: 'tm14', x: 0 }, // HR Agent
    ],
  },
  {
    id: 'coo',
    label: 'Chief of Staff',
    color: '#f97316',
    bg: 'bg-[#f97316]/5 border-[#f97316]/15',
    desks: [
      { memberId: 'tm8', x: 0 }, // Erel
    ],
  },
]

const STATUS_GLOW: Record<string, string> = {
  active: 'shadow-[0_0_8px_rgba(34,197,94,0.4)]',
  busy: 'shadow-[0_0_8px_rgba(250,204,21,0.4)]',
  away: 'shadow-none',
}

const STATUS_DOT: Record<string, string> = {
  active: 'bg-[#22c55e]',
  busy: 'bg-[#facc15] animate-pulse',
  away: 'bg-[#444]',
}

export default function OfficePage() {
  const getMember = (id: string) => teamMembers.find(m => m.id === id)
  const recentActivity = activityLogs.slice(0, 6)

  return (
    <div className="p-5 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-[10px] tracking-[3px] uppercase text-[#00e5ff] mb-1">Office</h1>
        <p className="text-[#444] text-xs">Live view of the EVRNEW operations floor — {teamMembers.filter(m => m.status !== 'away').length} people working now</p>
      </div>

      {/* Office floor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {ZONES.map(zone => (
          <div key={zone.id} className={`border rounded-xl p-4 ${zone.bg}`}>
            {/* Zone header */}
            <div className="flex items-center gap-2 mb-3 pb-2 border-b" style={{ borderColor: zone.color + '20' }}>
              <span className="w-1.5 h-1.5 rounded-sm inline-block" style={{ backgroundColor: zone.color }} />
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: zone.color }}>
                {zone.label}
              </span>
            </div>

            {/* Desks */}
            <div className="space-y-2">
              {zone.desks.map(({ memberId }) => {
                const member = getMember(memberId)
                if (!member) return null
                return (
                  <Desk key={memberId} member={member} zoneColor={zone.color} />
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Activity ticker */}
      <div>
        <h2 className="text-[10px] tracking-[3px] uppercase text-[#444] mb-3 pb-2 border-b border-[#2a2a2a]">
          Live Activity
        </h2>
        <div className="space-y-2">
          {recentActivity.map(log => (
            <div key={log.id} className="flex items-start gap-3 text-xs">
              <span className="text-[#333] shrink-0 text-[10px] pt-0.5">
                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-[#444] shrink-0">{log.actor}</span>
              <span className="text-[#555]">{log.details}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-[#2a2a2a] flex items-center gap-6">
        <span className="text-[10px] text-[#333] uppercase tracking-wide">Status:</span>
        {[
          { dot: 'bg-[#22c55e]', label: 'Active' },
          { dot: 'bg-[#facc15]', label: 'Busy' },
          { dot: 'bg-[#444]', label: 'Away' },
        ].map(({ dot, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full inline-block ${dot}`} />
            <span className="text-[10px] text-[#444]">{label}</span>
          </div>
        ))}
        <span className="text-[10px] text-[#333] ml-2">
          <span className="text-[#a78bfa] text-[9px] border border-[#7c3aed]/25 bg-[#7c3aed]/10 px-1.5 py-0.5 rounded mr-1">AI</span>
          = AI agent
        </span>
      </div>
    </div>
  )
}

function Desk({ member, zoneColor }: { member: typeof teamMembers[number]; zoneColor: string }) {
  const avatarColors = [
    'bg-[#7c3aed]/20 text-[#a78bfa]',
    'bg-[#00e5ff]/10 text-[#00e5ff]',
    'bg-[#22c55e]/10 text-[#22c55e]',
    'bg-[#f97316]/10 text-[#f97316]',
    'bg-[#facc15]/10 text-[#facc15]',
    'bg-[#f472b6]/10 text-[#f472b6]',
  ]
  const avatarColor = avatarColors[member.name.charCodeAt(0) % avatarColors.length]

  return (
    <div className={`flex items-center gap-3 bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-3 py-2.5 transition-all ${STATUS_GLOW[member.status]}`}>
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${avatarColor} relative`}>
        {member.avatar}
        <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#0d0d0d] inline-block ${STATUS_DOT[member.status]}`} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-[#e8e8e8]">{member.name}</span>
          {member.type === 'ai' && (
            <span className="text-[8px] bg-[#7c3aed]/15 text-[#a78bfa] border border-[#7c3aed]/25 px-1 py-0.5 rounded leading-none">AI</span>
          )}
        </div>
        <p className="text-[10px] leading-tight" style={{ color: zoneColor + 'aa' }}>{member.currentActivity}</p>
      </div>

      {/* Pixel desk icon */}
      <div className="shrink-0">
        <DeskIcon status={member.status} />
      </div>
    </div>
  )
}

// Tiny pixel-art style desk icons
function DeskIcon({ status }: { status: string }) {
  if (status === 'away') {
    return (
      <div className="w-5 h-5 relative">
        <div className="w-4 h-2.5 bg-[#1e1e1e] border border-[#2a2a2a] rounded-sm absolute bottom-0 left-0.5" />
        <div className="w-1 h-3.5 bg-[#1e1e1e] border border-[#2a2a2a] rounded-sm absolute bottom-0 left-2" />
      </div>
    )
  }
  if (status === 'busy') {
    return (
      <div className="w-5 h-5 relative">
        <div className="w-4 h-2.5 bg-[#facc15]/10 border border-[#facc15]/25 rounded-sm absolute bottom-0 left-0.5" />
        <div className="w-1 h-3.5 bg-[#facc15]/10 border border-[#facc15]/25 rounded-sm absolute bottom-0 left-2" />
        <div className="w-1 h-1 bg-[#facc15]/60 rounded-full absolute top-0 right-0 animate-pulse" />
      </div>
    )
  }
  return (
    <div className="w-5 h-5 relative">
      <div className="w-4 h-2.5 bg-[#00e5ff]/8 border border-[#00e5ff]/20 rounded-sm absolute bottom-0 left-0.5" />
      <div className="w-1 h-3.5 bg-[#00e5ff]/8 border border-[#00e5ff]/20 rounded-sm absolute bottom-0 left-2" />
      <div className="w-1 h-1 bg-[#22c55e] rounded-full absolute top-0 right-0 animate-pulse" />
    </div>
  )
}
