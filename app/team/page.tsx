// Team — Human crew + AI operations team + system agents.
// Shows role, responsibilities, status, and current activity.

import { teamMembers, systemAgents, type TeamMember } from '@/lib/data'

const STATUS_STYLES: Record<TeamMember['status'], { dot: string; label: string }> = {
  active: { dot: 'bg-emerald-500', label: 'Active' },
  busy: { dot: 'bg-amber-400 animate-pulse', label: 'Busy' },
  away: { dot: 'bg-slate-400', label: 'Away' },
}

const WORKLOAD_STYLES: Record<TeamMember['workload'], string> = {
  light: 'text-emerald-600',
  normal: 'text-amber-500',
  heavy: 'text-red-600',
}

const WORKLOAD_BAR: Record<TeamMember['workload'], number> = {
  light: 30,
  normal: 65,
  heavy: 95,
}

export default function TeamPage() {
  const aiOpsTeam = teamMembers.filter(m => m.type === 'ai' && m.id !== 'tm8')

  return (
    <div className="px-5 py-6 max-w-6xl mx-auto space-y-10">
      <div>
        <h1 className="text-[10px] tracking-[3px] uppercase text-sky-600 mb-1">Team</h1>
        <p className="text-slate-500 text-xs">{aiOpsTeam.length} AI agents active</p>
      </div>

      {/* AI Operations Team */}
      <section>
        <SectionTitle>AI Operations Team ({aiOpsTeam.length})</SectionTitle>
        <p className="text-slate-500 text-xs mb-4">Mission Control AI agents handling sales, operations, scheduling, finance, marketing, HR, and documentation.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {aiOpsTeam.map(member => (
            <MemberCard key={member.id} member={member} />
          ))}
        </div>
      </section>

      {/* System Agents */}
      <section>
        <SectionTitle>System Agents — CrewAI Marketing Stack (8)</SectionTitle>
        <p className="text-slate-500 text-xs mb-4">Original 8 specialized marketing agents orchestrated by CrewAI, running 24/7 on the erel.local server.</p>
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
    'bg-[#bf5fff]/20 text-violet-600',
    'bg-sky-50 text-sky-600',
    'bg-emerald-50 text-emerald-600',
    'bg-[#ff6b00]/10 text-[#ff6b00]',
    'bg-amber-50 text-amber-500',
  ]
  const avatarColor = avatarColors[member.name.charCodeAt(0) % avatarColors.length]
  const status = STATUS_STYLES[member.status]

  return (
    <div className={`bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md hover:border-slate-300 transition-all ${featured ? 'border-[#00ffff]/20' : ''}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className={`${featured ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs'} ${avatarColor} rounded-lg flex items-center justify-center font-bold shrink-0`}>
          {member.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-slate-900">{member.name}</p>
            {member.type === 'ai' && (
              <span className="text-[9px] bg-violet-50 text-violet-600 border border-violet-400 px-1.5 py-0.5 rounded">AI</span>
            )}
          </div>
          <p className="text-[11px] text-slate-400">{member.role}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`w-1.5 h-1.5 rounded-full inline-block ${status.dot}`} />
          <span className="text-[10px] text-slate-500">{status.label}</span>
        </div>
      </div>

      {/* Current activity */}
      <div className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 mb-3">
        <p className="text-[10px] text-slate-400 mb-0.5">Now:</p>
        <p className="text-[11px] text-slate-700">{member.currentActivity}</p>
      </div>

      {/* Responsibilities */}
      <ul className="space-y-0.5 mb-3">
        {member.responsibilities.slice(0, 3).map(r => (
          <li key={r} className="text-[10px] text-slate-500 before:content-['→_'] before:text-sky-600/40">{r}</li>
        ))}
        {member.responsibilities.length > 3 && (
          <li className="text-[10px] text-slate-400">+{member.responsibilities.length - 3} more</li>
        )}
      </ul>

      {/* Workload */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] text-slate-400 uppercase tracking-wide">Workload</span>
          <span className={`text-[9px] font-medium ${WORKLOAD_STYLES[member.workload]}`}>{member.workload}</span>
        </div>
        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              member.workload === 'heavy' ? 'bg-red-500' : member.workload === 'normal' ? 'bg-amber-400' : 'bg-emerald-500'
            }`}
            style={{ width: `${WORKLOAD_BAR[member.workload]}%` }}
          />
        </div>
      </div>

      {member.model && (
        <p className="text-[9px] text-slate-400 mt-2">Model: <span className="text-slate-500">{member.model}</span></p>
      )}
    </div>
  )
}

function SystemAgentCard({ agent }: { agent: typeof systemAgents[number] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 hover:shadow-md hover:border-slate-300 transition-all">
      <div className="flex items-center justify-between gap-1.5 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-pulse" />
          <span className="text-[10px] text-emerald-600">active</span>
        </div>
        <span className="text-[9px] text-slate-400 font-mono truncate">{agent.schedule}</span>
      </div>
      <p className="text-[11px] font-semibold text-slate-900 mb-1 leading-snug">{agent.role}</p>
      {agent.description && (
        <p className="text-[10px] text-slate-500 mb-2 leading-snug">{agent.description}</p>
      )}
      <p className="text-[10px] text-slate-400">LLM: <span className="text-violet-600">{agent.llm}</span></p>
      {agent.plist && <p className="text-[9px] text-slate-400 mt-0.5 font-mono truncate">{agent.plist}</p>}
      <div className="mt-2 flex flex-wrap gap-1">
        {agent.tools.map(t => (
          <span key={t} className="text-[9px] bg-white border border-slate-100 text-slate-400 px-1.5 py-0.5 rounded">{t}</span>
        ))}
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] tracking-[3px] uppercase text-sky-600 mb-3 pb-2 border-b border-slate-200">
      {children}
    </h2>
  )
}
