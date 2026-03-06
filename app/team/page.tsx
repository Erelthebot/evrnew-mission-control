// Team — Human crew + AI operations team + system agents.
// Shows role, responsibilities, status, and current activity.

import { teamMembers, systemAgents, type TeamMember } from '@/lib/data'

const STATUS_STYLES: Record<TeamMember['status'], { dot: string; label: string }> = {
  active: { dot: 'bg-[#22c55e]', label: 'Active' },
  busy: { dot: 'bg-[#facc15] animate-pulse', label: 'Busy' },
  away: { dot: 'bg-[#444]', label: 'Away' },
}

const WORKLOAD_STYLES: Record<TeamMember['workload'], string> = {
  light: 'text-[#22c55e]',
  normal: 'text-[#facc15]',
  heavy: 'text-[#ef4444]',
}

const WORKLOAD_BAR: Record<TeamMember['workload'], number> = {
  light: 30,
  normal: 65,
  heavy: 95,
}

export default function TeamPage() {
  const humanTeam = teamMembers.filter(m => m.type === 'human')
  const aiOpsTeam = teamMembers.filter(m => m.type === 'ai' && m.id !== 'tm8')
  const chiefOfStaff = teamMembers.find(m => m.id === 'tm8')!

  return (
    <div className="px-5 py-6 max-w-6xl mx-auto space-y-10">
      <div>
        <h1 className="text-[10px] tracking-[3px] uppercase text-[#00e5ff] mb-1">Team</h1>
        <p className="text-[#444] text-xs">{teamMembers.length} members &mdash; {teamMembers.filter(m => m.status === 'active').length} active now</p>
      </div>

      {/* Chief of Staff */}
      <section>
        <SectionTitle>Chief of Staff</SectionTitle>
        <div className="max-w-lg">
          <MemberCard member={chiefOfStaff} featured />
        </div>
      </section>

      {/* Human Team */}
      <section>
        <SectionTitle>Human Team ({humanTeam.length})</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {humanTeam.map(member => (
            <MemberCard key={member.id} member={member} />
          ))}
        </div>
      </section>

      {/* AI Operations Team */}
      <section>
        <SectionTitle>AI Operations Team ({aiOpsTeam.length})</SectionTitle>
        <p className="text-[#444] text-xs mb-4">Mission Control AI agents handling sales, operations, scheduling, finance, marketing, HR, and documentation.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {aiOpsTeam.map(member => (
            <MemberCard key={member.id} member={member} />
          ))}
        </div>
      </section>

      {/* System Agents */}
      <section>
        <SectionTitle>System Agents — CrewAI Marketing Stack (8)</SectionTitle>
        <p className="text-[#444] text-xs mb-4">Original 8 specialized marketing agents orchestrated by CrewAI, running 24/7 on the erel.local server.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {systemAgents.map(agent => (
            <SystemAgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </section>
    </div>
  )
}

function MemberCard({ member, featured = false }: { member: TeamMember; featured?: boolean }) {
  const avatarColors = [
    'bg-[#7c3aed]/20 text-[#a78bfa]',
    'bg-[#00e5ff]/10 text-[#00e5ff]',
    'bg-[#22c55e]/10 text-[#22c55e]',
    'bg-[#f97316]/10 text-[#f97316]',
    'bg-[#facc15]/10 text-[#facc15]',
  ]
  const avatarColor = avatarColors[member.name.charCodeAt(0) % avatarColors.length]
  const status = STATUS_STYLES[member.status]

  return (
    <div className={`bg-[#161616] border border-[#2a2a2a] rounded-lg p-4 ${featured ? 'border-[#00e5ff]/20' : ''}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className={`${featured ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs'} ${avatarColor} rounded-lg flex items-center justify-center font-bold shrink-0`}>
          {member.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-[#e8e8e8]">{member.name}</p>
            {member.type === 'ai' && (
              <span className="text-[9px] bg-[#7c3aed]/15 text-[#a78bfa] border border-[#7c3aed]/25 px-1.5 py-0.5 rounded">AI</span>
            )}
          </div>
          <p className="text-[11px] text-[#555]">{member.role}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`w-1.5 h-1.5 rounded-full inline-block ${status.dot}`} />
          <span className="text-[10px] text-[#444]">{status.label}</span>
        </div>
      </div>

      {/* Current activity */}
      <div className="bg-[#0f0f0f] rounded px-2.5 py-1.5 mb-3">
        <p className="text-[10px] text-[#444] mb-0.5">Now:</p>
        <p className="text-[11px] text-[#666]">{member.currentActivity}</p>
      </div>

      {/* Responsibilities */}
      <ul className="space-y-0.5 mb-3">
        {member.responsibilities.slice(0, 3).map(r => (
          <li key={r} className="text-[10px] text-[#444] before:content-['→_'] before:text-[#00e5ff]/40">{r}</li>
        ))}
        {member.responsibilities.length > 3 && (
          <li className="text-[10px] text-[#333]">+{member.responsibilities.length - 3} more</li>
        )}
      </ul>

      {/* Workload */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] text-[#333] uppercase tracking-wide">Workload</span>
          <span className={`text-[9px] font-medium ${WORKLOAD_STYLES[member.workload]}`}>{member.workload}</span>
        </div>
        <div className="w-full h-1 bg-[#1e1e1e] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              member.workload === 'heavy' ? 'bg-[#ef4444]' : member.workload === 'normal' ? 'bg-[#facc15]' : 'bg-[#22c55e]'
            }`}
            style={{ width: `${WORKLOAD_BAR[member.workload]}%` }}
          />
        </div>
      </div>

      {member.model && (
        <p className="text-[9px] text-[#333] mt-2">Model: <span className="text-[#444]">{member.model}</span></p>
      )}
    </div>
  )
}

function SystemAgentCard({ agent }: { agent: typeof systemAgents[number] }) {
  const badgeColors: Record<string, string> = {
    blue: 'bg-[#00e5ff]/10 text-[#00e5ff] border-[#00e5ff]/25',
    purple: 'bg-[#7c3aed]/15 text-[#a78bfa] border-[#7c3aed]/30',
    green: 'bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/25',
    yellow: 'bg-[#facc15]/10 text-[#facc15] border-[#facc15]/25',
    red: 'bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/25',
  }
  return (
    <div className="bg-[#161616] border border-[#2a2a2a] rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="w-1.5 h-1.5 bg-[#22c55e] rounded-full inline-block animate-pulse" />
        <span className="text-[10px] text-[#444]">running</span>
      </div>
      <span className={`text-[10px] px-1.5 py-0.5 rounded border inline-block mb-2 font-medium ${badgeColors[agent.badge]}`}>
        {agent.name}
      </span>
      <p className="text-[11px] text-[#555] mb-2 leading-snug">{agent.role}</p>
      <p className="text-[10px] text-[#333]">Model: <span className="text-[#444]">{agent.model}</span></p>
      <p className="text-[9px] text-[#333] mt-1 truncate">{agent.tools}</p>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] tracking-[3px] uppercase text-[#00e5ff] mb-3 pb-2 border-b border-[#2a2a2a]">
      {children}
    </h2>
  )
}
