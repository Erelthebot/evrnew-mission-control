'use client'

// Task Board — Kanban view of all EVRNEW tasks.
// Data model is Convex-ready: swap tasks array with useMutation/useQuery hooks.

import { useState } from 'react'
import { tasks, PRIORITY_COLORS, type Task, type TaskStatus, type Priority } from '@/lib/data'

const COLUMNS: { key: TaskStatus; label: string; color: string }[] = [
  { key: 'todo', label: 'To Do', color: '#444' },
  { key: 'in_progress', label: 'In Progress', color: '#00e5ff' },
  { key: 'review', label: 'Review', color: '#facc15' },
  { key: 'done', label: 'Done', color: '#22c55e' },
]

export default function TasksPage() {
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all')
  const [filterAssignee, setFilterAssignee] = useState('all')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const assignees = ['all', ...Array.from(new Set(tasks.map(t => t.assignee)))]

  const filtered = tasks.filter(t => {
    const matchSearch = search === '' || t.title.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase())
    const matchPriority = filterPriority === 'all' || t.priority === filterPriority
    const matchAssignee = filterAssignee === 'all' || t.assignee === filterAssignee
    return matchSearch && matchPriority && matchAssignee
  })

  const byStatus = (status: TaskStatus) => filtered.filter(t => t.status === status)

  return (
    <div className="flex h-full">
      {/* Main kanban */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="px-5 py-3 border-b border-[#2a2a2a] flex items-center gap-3 flex-wrap">
          <div>
            <h1 className="text-[10px] tracking-[3px] uppercase text-[#00e5ff]">Task Board</h1>
            <p className="text-[#444] text-[10px]">{tasks.length} tasks &mdash; {tasks.filter(t => t.status !== 'done').length} open</p>
          </div>
          <div className="flex-1" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-[#1e1e1e] border border-[#2a2a2a] text-[#aaa] text-xs px-3 py-1.5 rounded outline-none focus:border-[#444] placeholder:text-[#444] w-48"
          />
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value as Priority | 'all')}
            className="bg-[#1e1e1e] border border-[#2a2a2a] text-[#aaa] text-xs px-2 py-1.5 rounded outline-none"
          >
            <option value="all">All priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={filterAssignee}
            onChange={e => setFilterAssignee(e.target.value)}
            className="bg-[#1e1e1e] border border-[#2a2a2a] text-[#aaa] text-xs px-2 py-1.5 rounded outline-none"
          >
            {assignees.map(a => (
              <option key={a} value={a}>{a === 'all' ? 'All assignees' : a}</option>
            ))}
          </select>
        </div>

        {/* Kanban columns */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-3 h-full p-4 min-w-max">
            {COLUMNS.map(col => (
              <div key={col.key} className="w-72 flex flex-col">
                {/* Column header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: col.color }} />
                    <span className="text-xs font-semibold" style={{ color: col.color }}>{col.label}</span>
                  </div>
                  <span className="text-[10px] text-[#444] bg-[#1e1e1e] px-2 py-0.5 rounded-full">
                    {byStatus(col.key).length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto kanban-col space-y-2 pr-1">
                  {byStatus(col.key).length === 0 && (
                    <div className="text-[#333] text-xs text-center py-8 border border-dashed border-[#222] rounded-lg">
                      No tasks
                    </div>
                  )}
                  {byStatus(col.key).map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onClick={() => setSelectedTask(task)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Task detail panel */}
      {selectedTask && (
        <div className="w-80 border-l border-[#2a2a2a] flex flex-col bg-[#0f0f0f]">
          <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center justify-between">
            <span className="text-[10px] tracking-widest uppercase text-[#444]">Task Detail</span>
            <button onClick={() => setSelectedTask(null)} className="text-[#444] hover:text-[#888] text-sm">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 text-xs">
            <div>
              <p className="text-[#00e5ff] text-[10px] uppercase tracking-wide mb-1">Title</p>
              <p className="text-[#e8e8e8] leading-relaxed">{selectedTask.title}</p>
            </div>
            <div>
              <p className="text-[#00e5ff] text-[10px] uppercase tracking-wide mb-1">Description</p>
              <p className="text-[#666] leading-relaxed">{selectedTask.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[#00e5ff] text-[10px] uppercase tracking-wide mb-1">Assignee</p>
                <p className="text-[#aaa]">{selectedTask.assignee}</p>
              </div>
              <div>
                <p className="text-[#00e5ff] text-[10px] uppercase tracking-wide mb-1">Priority</p>
                <PriorityBadge priority={selectedTask.priority} />
              </div>
              <div>
                <p className="text-[#00e5ff] text-[10px] uppercase tracking-wide mb-1">Due</p>
                <p className="text-[#aaa]">{selectedTask.dueDate}</p>
              </div>
              <div>
                <p className="text-[#00e5ff] text-[10px] uppercase tracking-wide mb-1">Status</p>
                <StatusBadge status={selectedTask.status} />
              </div>
            </div>
            {selectedTask.relatedAgent && (
              <div>
                <p className="text-[#00e5ff] text-[10px] uppercase tracking-wide mb-1">Related Agent</p>
                <span className="bg-[#7c3aed]/15 text-[#a78bfa] border border-[#7c3aed]/30 text-[10px] px-2 py-0.5 rounded">
                  {selectedTask.relatedAgent}
                </span>
              </div>
            )}
            <div>
              <p className="text-[#00e5ff] text-[10px] uppercase tracking-wide mb-1">Tags</p>
              <div className="flex flex-wrap gap-1">
                {selectedTask.tags.map(tag => (
                  <span key={tag} className="bg-[#1e1e1e] text-[#555] text-[10px] px-2 py-0.5 rounded border border-[#2a2a2a]">{tag}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[#00e5ff] text-[10px] uppercase tracking-wide mb-1">Created by</p>
              <p className="text-[#555]">{selectedTask.createdBy}</p>
            </div>
            <div>
              <p className="text-[#00e5ff] text-[10px] uppercase tracking-wide mb-1">Updated</p>
              <p className="text-[#444]">{new Date(selectedTask.updatedAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-[#161616] border border-[#2a2a2a] rounded-lg p-3 hover:border-[#3a3a3a] transition-colors group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-xs text-[#e8e8e8] leading-snug group-hover:text-white transition-colors">{task.title}</p>
        <PriorityDot priority={task.priority} />
      </div>
      <p className="text-[11px] text-[#444] leading-relaxed line-clamp-2 mb-2">{task.description}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Avatar name={task.assignee} size="sm" />
          <span className="text-[10px] text-[#555]">{task.assignee}</span>
        </div>
        <span className="text-[10px] text-[#444]">{task.dueDate}</span>
      </div>
      {task.tags.slice(0, 2).length > 0 && (
        <div className="flex gap-1 mt-2">
          {task.tags.slice(0, 2).map(tag => (
            <span key={tag} className="text-[9px] bg-[#1e1e1e] text-[#444] px-1.5 py-0.5 rounded border border-[#2a2a2a]">{tag}</span>
          ))}
        </div>
      )}
    </button>
  )
}

function PriorityDot({ priority }: { priority: Priority }) {
  const colors: Record<Priority, string> = { critical: '#ef4444', high: '#f97316', medium: '#facc15', low: '#666' }
  return <span className="w-2 h-2 rounded-full shrink-0 mt-0.5 inline-block" style={{ backgroundColor: colors[priority] }} title={priority} />
}

function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded border ${PRIORITY_COLORS[priority]}`}>
      {priority}
    </span>
  )
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const map: Record<TaskStatus, string> = {
    todo: 'text-[#666]',
    in_progress: 'text-[#00e5ff]',
    review: 'text-[#facc15]',
    done: 'text-[#22c55e]',
  }
  const labels: Record<TaskStatus, string> = {
    todo: 'To Do',
    in_progress: 'In Progress',
    review: 'Review',
    done: 'Done',
  }
  return <span className={`text-xs font-medium ${map[status]}`}>{labels[status]}</span>
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const colors = ['bg-[#7c3aed]/30 text-[#a78bfa]', 'bg-[#00e5ff]/10 text-[#00e5ff]', 'bg-[#22c55e]/10 text-[#22c55e]', 'bg-[#f97316]/10 text-[#f97316]']
  const color = colors[name.charCodeAt(0) % colors.length]
  const sizeClass = size === 'sm' ? 'w-4 h-4 text-[8px]' : 'w-6 h-6 text-[10px]'
  return (
    <span className={`${sizeClass} ${color} rounded-full inline-flex items-center justify-center font-bold`}>
      {initials}
    </span>
  )
}
