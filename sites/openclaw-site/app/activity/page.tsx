'use client'

// Activity Feed — Real-time timestamped audit log.
// Convex-ready: swap activityLogs with useQuery + pagination.

import { useState } from 'react'
import { activityLogs, timeAgo, type ActivityLog } from '@/lib/data'

type Category = ActivityLog['category'] | 'all'

const CATEGORY_STYLES: Record<ActivityLog['category'], { color: string; label: string; icon: string }> = {
  task: { color: '#00e5ff', label: 'Task', icon: '▦' },
  document: { color: '#a78bfa', label: 'Document', icon: '◻' },
  memory: { color: '#34d399', label: 'Memory', icon: '◎' },
  project: { color: '#f97316', label: 'Project', icon: '◈' },
  event: { color: '#facc15', label: 'Event', icon: '◫' },
  automation: { color: '#f472b6', label: 'Automation', icon: '⟳' },
  agent: { color: '#c084fc', label: 'Agent', icon: '◉' },
  system: { color: '#22c55e', label: 'System', icon: '◬' },
}

const ALL_ACTORS = ['all', ...Array.from(new Set(activityLogs.map(l => l.actor)))]

export default function ActivityPage() {
  const [filterCategory, setFilterCategory] = useState<Category>('all')
  const [filterActor, setFilterActor] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = activityLogs.filter(l => {
    const matchCat = filterCategory === 'all' || l.category === filterCategory
    const matchActor = filterActor === 'all' || l.actor === filterActor
    const matchSearch = search === '' || l.details.toLowerCase().includes(search.toLowerCase()) || l.action.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchActor && matchSearch
  })

  // Already sorted newest first
  const grouped = groupByDay(filtered)

  return (
    <div className="flex h-full">
      {/* Filters sidebar */}
      <div className="w-44 shrink-0 border-r border-[#2a2a2a] py-4 px-3 space-y-4">
        {/* Category filters */}
        <div>
          <p className="text-[9px] tracking-widest uppercase text-[#333] mb-2 px-2">Category</p>
          <button
            onClick={() => setFilterCategory('all')}
            className={`w-full text-left text-xs px-2 py-1.5 rounded flex items-center justify-between transition-colors ${filterCategory === 'all' ? 'bg-[#00e5ff]/8 text-[#00e5ff]' : 'text-[#555] hover:text-[#888]'}`}
          >
            <span>All</span>
            <span className="text-[10px] text-[#333]">{activityLogs.length}</span>
          </button>
          {(Object.entries(CATEGORY_STYLES) as [ActivityLog['category'], typeof CATEGORY_STYLES[ActivityLog['category']]][]).map(([key, style]) => {
            const count = activityLogs.filter(l => l.category === key).length
            return (
              <button
                key={key}
                onClick={() => setFilterCategory(key)}
                className={`w-full text-left text-xs px-2 py-1.5 rounded flex items-center gap-2 transition-colors ${filterCategory === key ? 'font-medium' : 'text-[#555] hover:text-[#888]'}`}
                style={filterCategory === key ? { color: style.color } : {}}
              >
                <span className="text-[10px]">{style.icon}</span>
                <span className="flex-1">{style.label}</span>
                <span className="text-[10px] text-[#333]">{count}</span>
              </button>
            )
          })}
        </div>

        {/* Actor filter */}
        <div>
          <p className="text-[9px] tracking-widest uppercase text-[#333] mb-2 px-2">Actor</p>
          <div className="space-y-0.5">
            {ALL_ACTORS.slice(0, 12).map(actor => (
              <button
                key={actor}
                onClick={() => setFilterActor(actor)}
                className={`w-full text-left text-[11px] px-2 py-1 rounded truncate transition-colors ${filterActor === actor ? 'bg-white/5 text-[#aaa]' : 'text-[#444] hover:text-[#666]'}`}
              >
                {actor === 'all' ? 'All actors' : actor}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main feed */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="px-5 py-3 border-b border-[#2a2a2a] flex items-center gap-3">
          <div>
            <h1 className="text-[10px] tracking-[3px] uppercase text-[#00e5ff]">Activity Feed</h1>
            <p className="text-[#444] text-[10px]">{filtered.length} events &mdash; real-time audit log</p>
          </div>
          <div className="flex-1" />
          <input
            type="text"
            placeholder="Search events..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-[#1e1e1e] border border-[#2a2a2a] text-[#aaa] text-xs px-3 py-1.5 rounded outline-none focus:border-[#444] placeholder:text-[#444] w-52"
          />
          {/* Convex note */}
          <span className="text-[10px] text-[#333] hidden lg:block">
            → Connect Convex for live streaming
          </span>
        </div>

        {/* Feed */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-[#333] text-sm text-center py-16">No events match your filters.</div>
          ) : (
            <div>
              {grouped.map(({ day, logs }) => (
                <div key={day}>
                  {/* Day separator */}
                  <div className="px-5 py-2 sticky top-0 bg-[#0d0d0d]/95 backdrop-blur-sm z-10">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-[#444] uppercase tracking-wide">{day}</span>
                      <div className="flex-1 h-px bg-[#1e1e1e]" />
                      <span className="text-[10px] text-[#333]">{logs.length} events</span>
                    </div>
                  </div>

                  {/* Events */}
                  <div className="px-5 pb-2">
                    {logs.map((log, i) => (
                      <ActivityRow key={log.id} log={log} isLast={i === logs.length - 1} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ActivityRow({ log, isLast }: { log: ActivityLog; isLast: boolean }) {
  const style = CATEGORY_STYLES[log.category]

  return (
    <div className="flex gap-4 group py-2">
      {/* Timeline */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] mt-0.5"
          style={{ backgroundColor: style.color + '12', color: style.color }}
        >
          {style.icon}
        </div>
        {!isLast && <div className="w-px flex-1 bg-[#1e1e1e] mt-1" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-2">
        <div className="flex items-start gap-2 flex-wrap">
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded border"
            style={{ color: style.color, backgroundColor: style.color + '10', borderColor: style.color + '25' }}
          >
            {log.action}
          </span>
          <span className="text-[10px] text-[#555]">by <span className="text-[#666]">{log.actor}</span></span>
          <span className="text-[10px] text-[#333] ml-auto">{timeAgo(log.timestamp)}</span>
        </div>
        <p className="text-xs text-[#555] mt-1 leading-relaxed">{log.details}</p>
        <span className="text-[10px] text-[#333]">
          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}

function groupByDay(logs: ActivityLog[]) {
  const groups: Record<string, ActivityLog[]> = {}
  for (const log of logs) {
    const day = new Date(log.timestamp).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    if (!groups[day]) groups[day] = []
    groups[day].push(log)
  }
  return Object.entries(groups).map(([day, logs]) => ({ day, logs }))
}
