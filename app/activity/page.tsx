'use client'

// Activity Feed — Real-time timestamped audit log.

import { useState, useEffect } from 'react'
import { timeAgo, type ActivityLog } from '@/lib/data'
import { supabase } from '@/lib/supabase'

type Category = ActivityLog['category'] | 'all'

const CATEGORY_STYLES: Record<ActivityLog['category'], { color: string; label: string; icon: string }> = {
  task: { color: '#00f5ff', label: 'Task', icon: '▦' },
  document: { color: '#d070ff', label: 'Document', icon: '◻' },
  memory: { color: '#34d399', label: 'Memory', icon: '◎' },
  project: { color: '#ff6600', label: 'Project', icon: '◈' },
  event: { color: '#ffee00', label: 'Event', icon: '◫' },
  automation: { color: '#f472b6', label: 'Automation', icon: '⟳' },
  agent: { color: '#c084fc', label: 'Agent', icon: '◉' },
  system: { color: '#00ff88', label: 'System', icon: '◬' },
}

export default function ActivityPage() {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState<Category>('all')
  const [filterActor, setFilterActor] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase.from('activity_logs').select('*').order('timestamp', { ascending: false }).limit(100).then(({ data, error }) => {
      if (!error && data) {
        setActivityLogs(data.map((l: any) => ({
          ...l,
          relatedId: l.related_id,
        })) as ActivityLog[])
      }
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="px-5 py-6 text-xs text-slate-400">Loading activity feed...</div>
  )

  const ALL_ACTORS = ['all', ...Array.from(new Set(activityLogs.map(l => l.actor)))]

  const filtered = activityLogs.filter(l => {
    const matchCat = filterCategory === 'all' || l.category === filterCategory
    const matchActor = filterActor === 'all' || l.actor === filterActor
    const matchSearch = search === '' || l.details.toLowerCase().includes(search.toLowerCase()) || l.action.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchActor && matchSearch
  })

  // Already sorted newest first
  const grouped = groupByDay(filtered)

  return (
    <div className="flex">
      {/* Filters sidebar */}
      <div className="w-44 shrink-0 border-r border-slate-200 py-4 px-3 space-y-4">
        {/* Category filters */}
        <div>
          <p className="text-[9px] tracking-widest uppercase text-slate-400 mb-2 px-2">Category</p>
          <button
            onClick={() => setFilterCategory('all')}
            className={`w-full text-left text-xs px-2 py-1.5 rounded flex items-center justify-between transition-colors ${filterCategory === 'all' ? 'bg-sky-50 text-sky-600' : 'text-slate-500 hover:text-slate-600'}`}
          >
            <span>All</span>
            <span className="text-[10px] text-slate-400">{activityLogs.length}</span>
          </button>
          {(Object.entries(CATEGORY_STYLES) as [ActivityLog['category'], typeof CATEGORY_STYLES[ActivityLog['category']]][]).map(([key, style]) => {
            const count = activityLogs.filter(l => l.category === key).length
            return (
              <button
                key={key}
                onClick={() => setFilterCategory(key)}
                className={`w-full text-left text-xs px-2 py-1.5 rounded flex items-center gap-2 transition-colors ${filterCategory === key ? 'font-medium' : 'text-slate-500 hover:text-slate-600'}`}
                style={filterCategory === key ? { color: style.color } : {}}
              >
                <span className="text-[10px]">{style.icon}</span>
                <span className="flex-1">{style.label}</span>
                <span className="text-[10px] text-slate-400">{count}</span>
              </button>
            )
          })}
        </div>

        {/* Actor filter */}
        <div>
          <p className="text-[9px] tracking-widest uppercase text-slate-400 mb-2 px-2">Actor</p>
          <div className="space-y-0.5">
            {ALL_ACTORS.slice(0, 12).map(actor => (
              <button
                key={actor}
                onClick={() => setFilterActor(actor)}
                className={`w-full text-left text-[11px] px-2 py-1 rounded truncate transition-colors ${filterActor === actor ? 'bg-slate-100 text-slate-600' : 'text-slate-500 hover:text-slate-500'}`}
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
        <div className="px-5 py-3 border-b border-slate-200 flex items-center gap-3">
          <div>
            <h1 className="text-[10px] tracking-[3px] uppercase text-sky-600">Activity Feed</h1>
            <p className="text-slate-500 text-[10px]">{filtered.length} events &mdash; real-time audit log</p>
          </div>
          <div className="flex-1" />
          <input
            type="text"
            placeholder="Search events..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-slate-100 border border-slate-200 text-slate-600 text-xs px-3 py-1.5 rounded outline-none focus:border-[#6040a0] placeholder:text-slate-500 w-52"
          />
          {/* Convex note */}
          <span className="text-[10px] text-slate-400 hidden lg:block">
            → Connect Convex for live streaming
          </span>
        </div>

        {/* Feed */}
        <div className="flex-1">
          {filtered.length === 0 ? (
            <div className="text-slate-400 text-sm text-center py-16">No events match your filters.</div>
          ) : (
            <div>
              {grouped.map(({ day, logs }) => (
                <div key={day}>
                  {/* Day separator */}
                  <div className="px-5 py-2 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wide">{day}</span>
                      <div className="flex-1 h-px bg-slate-100" />
                      <span className="text-[10px] text-slate-400">{logs.length} events</span>
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
        {!isLast && <div className="w-px flex-1 bg-slate-100 mt-1" />}
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
          <span className="text-[10px] text-slate-500">by <span className="text-slate-500">{log.actor}</span></span>
          <span className="text-[10px] text-slate-400 ml-auto">{timeAgo(log.timestamp)}</span>
        </div>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{log.details}</p>
        <span className="text-[10px] text-slate-400">
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
