'use client'

import { useState } from 'react'

type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done'
type TaskPriority = 'critical' | 'high' | 'medium' | 'low'

interface Task {
  id: string
  title: string
  status: TaskStatus
  priority: TaskPriority
  owner: string
  due: string
  project: string
  notes: string
}

const tasks: Task[] = [
  { id: 't1', title: 'Follow up: Martinez attic estimate', status: 'in_progress', priority: 'high', owner: 'Johnny', due: '2026-03-07', project: 'Sales Pipeline', notes: 'VM left, email sent, call Thu 10am' },
  { id: 't2', title: 'Submit PSE rebate — Johnson + Garcia', status: 'todo', priority: 'critical', owner: 'Diane', due: '2026-03-10', project: 'Rebate Fulfillment', notes: 'Deadline March 10 5pm' },
  { id: 't3', title: 'Post crawlspace lead installer job listing', status: 'todo', priority: 'high', owner: 'Misty', due: '2026-03-08', project: 'Hiring', notes: '' },
  { id: 't4', title: 'Build GHL automation: estimate follow-up 3-touch sequence', status: 'in_progress', priority: 'critical', owner: 'Erel', due: '2026-03-07', project: 'CRM System', notes: 'Day 1 email + Day 3 SMS + Day 7 last chance' },
  { id: 't5', title: 'Finalize attic installation SOP v3.0', status: 'in_progress', priority: 'high', owner: 'Documentation Agent', due: '2026-03-09', project: 'Operations Build-Out', notes: 'Adding blower door test section' },
  { id: 't6', title: 'Close Amazon HQ / Cascade Tech bid', status: 'todo', priority: 'critical', owner: 'Johnny', due: '2026-03-08', project: 'Sales Pipeline', notes: 'Competing with 2 bids, key differentiator: commercial insurance + crew size' },
  { id: 't7', title: 'Get QB API credentials from Diane', status: 'blocked', priority: 'high', owner: 'Diane', due: '2026-03-06', project: 'QuickBooks/Invoicing', notes: 'Blocking entire QB integration' },
  { id: 't8', title: 'Launch Bellevue spray foam landing page', status: 'todo', priority: 'high', owner: 'Marketing Agent', due: '2026-03-10', project: 'Marketing Automation', notes: 'Content written, needs CMS publish' },
  { id: 't9', title: 'Q1 Google Ads campaign review', status: 'in_progress', priority: 'high', owner: 'Ads Agent', due: '2026-03-08', project: 'Marketing Automation', notes: 'Paused 3 underperforming groups' },
  { id: 't10', title: 'Research WA contractor license for remediation work', status: 'todo', priority: 'medium', owner: 'Erel', due: '2026-03-15', project: 'Attic Remediation Services', notes: '' },
  { id: 't11', title: 'Get equipment pricing for crawlspace division', status: 'todo', priority: 'high', owner: 'Misty', due: '2026-03-10', project: 'Crawlspace Division Launch', notes: 'Dehumidifier supply deal needed' },
  { id: 't12', title: 'Train Johnny on new GHL pipeline stages', status: 'todo', priority: 'medium', owner: 'Erel', due: '2026-03-12', project: 'CRM System', notes: '' },
]

const PRIORITY_BADGE: Record<TaskPriority, string> = {
  critical: 'bg-red-100 text-red-700 border-red-300',
  high:     'bg-orange-100 text-orange-700 border-orange-300',
  medium:   'bg-amber-100 text-amber-700 border-amber-300',
  low:      'bg-slate-100 text-slate-600 border-slate-300',
}

const STATUS_COLUMNS: { status: TaskStatus; label: string; color: string; bg: string; border: string }[] = [
  { status: 'todo',        label: 'To Do',       color: 'text-slate-600',  bg: 'bg-slate-50',  border: 'border-slate-200' },
  { status: 'in_progress', label: 'In Progress', color: 'text-sky-600',    bg: 'bg-sky-50',    border: 'border-sky-200' },
  { status: 'blocked',     label: 'Blocked',     color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200' },
  { status: 'done',        label: 'Done',        color: 'text-emerald-600',bg: 'bg-emerald-50',border: 'border-emerald-200' },
]

function isOverdue(due: string): boolean {
  if (!due) return false
  return new Date(due) < new Date('2026-03-07')
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function TasksPage() {
  const [selected, setSelected] = useState<Task | null>(null)

  const total = tasks.length
  const inProgress = tasks.filter(t => t.status === 'in_progress').length
  const blocked = tasks.filter(t => t.status === 'blocked').length
  const critical = tasks.filter(t => t.priority === 'critical').length

  return (
    <div className="px-5 py-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[10px] tracking-[3px] uppercase text-sky-600 font-bold mb-1">Tasks</h1>
          <p className="text-xs text-slate-500">
            {total} total &middot; {inProgress} in progress &middot; {blocked} blocked &middot; {critical} critical
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Tasks',  value: total,      color: 'text-slate-600',   bg: 'bg-slate-50',   border: 'border-slate-200' },
          { label: 'In Progress',  value: inProgress, color: 'text-sky-600',     bg: 'bg-sky-50',     border: 'border-sky-200' },
          { label: 'Blocked',      value: blocked,    color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200' },
          { label: 'Critical',     value: critical,   color: 'text-orange-600',  bg: 'bg-orange-50',  border: 'border-orange-200' },
        ].map(s => (
          <div key={s.label} className={`rounded-lg p-3 border ${s.bg} ${s.border}`}>
            <p className={`text-[9px] uppercase tracking-widest font-bold mb-1 ${s.color}`}>{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATUS_COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.status)
          return (
            <div key={col.status}>
              <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg border-t border-x ${col.bg} ${col.border}`}>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${col.color}`}>{col.label}</span>
                <span className={`text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center ${col.bg} ${col.color} border ${col.border}`}>
                  {colTasks.length}
                </span>
              </div>
              <div className={`border-b border-x rounded-b-lg ${col.border} bg-white min-h-[200px] p-2 space-y-2`}>
                {colTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    selected={selected?.id === task.id}
                    onClick={() => setSelected(selected?.id === task.id ? null : task)}
                  />
                ))}
                {colTasks.length === 0 && (
                  <p className="text-[10px] text-slate-300 italic px-1 py-2">No tasks</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Side Panel */}
      {selected && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">{selected.title}</p>
              <p className="text-[10px] text-sky-600 mt-0.5">{selected.project}</p>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-slate-400 hover:text-slate-600 text-lg leading-none"
            >
              ×
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
            <div>
              <p className="text-[9px] uppercase tracking-widest text-slate-400 mb-1">Owner</p>
              <div className="flex items-center gap-1.5">
                <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 text-[9px] font-bold flex items-center justify-center">
                  {initials(selected.owner)}
                </span>
                <span className="text-slate-600">{selected.owner}</span>
              </div>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-widest text-slate-400 mb-1">Priority</p>
              <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${PRIORITY_BADGE[selected.priority]}`}>
                {selected.priority}
              </span>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-widest text-slate-400 mb-1">Due Date</p>
              <span className={`text-[11px] font-mono ${isOverdue(selected.due) ? 'text-red-600 font-bold' : 'text-slate-600'}`}>
                {selected.due} {isOverdue(selected.due) && '(overdue)'}
              </span>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-widest text-slate-400 mb-1">Status</p>
              <span className="text-[11px] text-slate-600 capitalize">{selected.status.replace('_', ' ')}</span>
            </div>
          </div>
          {selected.notes && (
            <div>
              <p className="text-[9px] uppercase tracking-widest text-slate-400 mb-1">Notes</p>
              <p className="text-[12px] text-slate-700 bg-slate-50 border border-slate-200 rounded p-3">{selected.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TaskCard({ task, selected, onClick }: { task: Task; selected: boolean; onClick: () => void }) {
  const overdue = isOverdue(task.due)

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg border p-2.5 transition-all cursor-pointer hover:shadow-sm ${
        selected
          ? 'border-sky-400 bg-sky-50 shadow-sm'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="flex items-start justify-between gap-1 mb-2">
        <p className="text-[11px] font-medium text-slate-800 leading-snug">{task.title}</p>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase ${PRIORITY_BADGE[task.priority]}`}>
          {task.priority}
        </span>
        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[9px] font-bold flex items-center justify-center shrink-0">
          {initials(task.owner)}
        </span>
        <span className={`text-[9px] font-mono ml-auto ${overdue ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
          {task.due.slice(5)}
        </span>
      </div>
      <p className="text-[9px] text-slate-400 mt-1 truncate">{task.project}</p>
    </button>
  )
}
