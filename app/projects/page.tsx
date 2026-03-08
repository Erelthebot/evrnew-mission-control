'use client'

// Projects — EVRNEW major initiatives board.
// Convex-ready: swap projects array with useQuery hook.

import { useState } from 'react'
import { projects, PROJECT_STATUS_COLORS, type Project, type ProjectStatus, type Priority, PRIORITY_COLORS } from '@/lib/data'

export default function ProjectsPage() {
  const [filter, setFilter] = useState<ProjectStatus | 'all'>('all')
  const [selected, setSelected] = useState<Project | null>(null)

  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter)

  const counts = {
    all: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    planning: projects.filter(p => p.status === 'planning').length,
    blocked: projects.filter(p => p.status === 'blocked').length,
    completed: projects.filter(p => p.status === 'completed').length,
  }

  return (
    <div className="flex h-full">
      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="px-5 py-3 border-b border-slate-200 flex items-center gap-3 flex-wrap">
          <div>
            <h1 className="text-[10px] tracking-[3px] uppercase text-sky-600">Projects</h1>
            <p className="text-slate-500 text-[10px]">{counts.active} active &middot; {counts.blocked} blocked &middot; {counts.planning} planning</p>
          </div>
          <div className="flex-1" />
          {(['all', 'active', 'planning', 'blocked', 'completed'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-[10px] px-2.5 py-1 rounded border transition-colors ${
                filter === s
                  ? 'bg-sky-50 border-sky-400 text-sky-600'
                  : 'border-slate-200 text-slate-500 hover:text-slate-600'
              }`}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)} {s !== 'all' ? `(${counts[s]})` : `(${counts.all})`}
            </button>
          ))}
        </div>

        {/* Project cards */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filtered.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                isSelected={selected?.id === project.id}
                onClick={() => setSelected(selected?.id === project.id ? null : project)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-80 border-l border-slate-200 flex flex-col bg-slate-50">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <span className="text-[10px] tracking-widest uppercase text-slate-500">Project Detail</span>
            <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-slate-600 text-sm">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 text-xs">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <StatusChip status={selected.status} />
                <PriorityChip priority={selected.priority} />
              </div>
              <p className="text-slate-900 font-semibold text-sm leading-snug">{selected.name}</p>
            </div>
            <div>
              <p className="text-sky-600 text-[10px] uppercase tracking-wide mb-1">Description</p>
              <p className="text-slate-500 leading-relaxed">{selected.description}</p>
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sky-600 text-[10px] uppercase tracking-wide">Progress</p>
                <span className="text-slate-500">{selected.percentComplete}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#00f5ff] transition-all"
                  style={{ width: `${selected.percentComplete}%` }}
                />
              </div>
            </div>

            <div>
              <p className="text-sky-600 text-[10px] uppercase tracking-wide mb-1">Owner</p>
              <p className="text-slate-600">{selected.owner}</p>
            </div>

            {selected.blockers.length > 0 && (
              <div>
                <p className="text-red-600 text-[10px] uppercase tracking-wide mb-1">Blockers</p>
                <ul className="space-y-1">
                  {selected.blockers.map((b, i) => (
                    <li key={i} className="text-red-600/70 leading-snug before:content-['!_'] before:text-red-600">{b}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <p className="text-sky-600 text-[10px] uppercase tracking-wide mb-1">Next Actions</p>
              <ul className="space-y-1">
                {selected.nextActions.map((a, i) => (
                  <li key={i} className="text-slate-500 leading-snug before:content-['→_'] before:text-sky-600">{a}</li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-sky-600 text-[10px] uppercase tracking-wide mb-1">Updated</p>
              <p className="text-slate-500">{new Date(selected.updatedAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ProjectCard({ project, isSelected, onClick }: { project: Project; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-left bg-white border rounded-lg p-4 transition-all hover:border-slate-300 ${
        isSelected ? 'border-sky-400' : 'border-slate-200'
      } ${project.status === 'blocked' ? 'border-l-2 border-l-[#ff2255]' : ''}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusChip status={project.status} />
          <PriorityChip priority={project.priority} />
        </div>
        <span className="text-[10px] text-slate-500 shrink-0">{project.percentComplete}%</span>
      </div>

      <p className="text-xs font-semibold text-slate-900 mb-1 leading-snug">{project.name}</p>
      <p className="text-[11px] text-slate-500 leading-relaxed mb-3 line-clamp-2">{project.description}</p>

      {/* Progress bar */}
      <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all ${
            project.status === 'blocked' ? 'bg-red-500' : project.status === 'completed' ? 'bg-emerald-500' : 'bg-[#00f5ff]'
          }`}
          style={{ width: `${project.percentComplete}%` }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-500">Owner: <span className="text-slate-500">{project.owner}</span></span>
        {project.blockers.length > 0 && (
          <span className="text-[9px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
            {project.blockers.length} blocker{project.blockers.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Next action preview */}
      {project.nextActions[0] && (
        <p className="text-[10px] text-slate-500 mt-2 truncate">
          <span className="text-sky-600/50">→</span> {project.nextActions[0]}
        </p>
      )}
    </button>
  )
}

function StatusChip({ status }: { status: ProjectStatus }) {
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase tracking-wide ${PROJECT_STATUS_COLORS[status]}`}>
      {status}
    </span>
  )
}

function PriorityChip({ priority }: { priority: Priority }) {
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase tracking-wide ${PRIORITY_COLORS[priority]}`}>
      {priority}
    </span>
  )
}
