'use client'

// Calendar — Weekly view of EVRNEW jobs, estimates, tasks, and automations.
// Convex-ready: swap calendarEvents with useQuery hook.

import { useState } from 'react'
import { calendarEvents, type CalendarEvent, type EventCategory } from '@/lib/data'

const CATEGORY_STYLES: Record<EventCategory, { color: string; bg: string; label: string }> = {
  job: { color: '#00f5ff', bg: 'bg-sky-50 border-sky-400', label: 'Job' },
  estimate: { color: '#d070ff', bg: 'bg-violet-50 border-violet-400', label: 'Estimate' },
  sales: { color: '#00ff88', bg: 'bg-emerald-50 border-emerald-400', label: 'Sales' },
  admin: { color: '#ffee00', bg: 'bg-amber-50 border-amber-400', label: 'Admin' },
  automation: { color: '#ff6600', bg: 'bg-orange-50 border-[#ff6600]/25', label: 'Automation' },
  reminder: { color: '#ff2255', bg: 'bg-red-50 border-[#ff2255]/25', label: 'Reminder' },
}

// Week starting 2026-03-02 (Mon)
const WEEK_DAYS = [
  { key: '2026-03-02', label: 'Mon 3/2' },
  { key: '2026-03-03', label: 'Tue 3/3' },
  { key: '2026-03-04', label: 'Wed 3/4' },
  { key: '2026-03-05', label: 'Thu 3/5' },
  { key: '2026-03-06', label: 'Fri 3/6' },
  { key: '2026-03-07', label: 'Sat 3/7' },
  { key: '2026-03-08', label: 'Sun 3/8' },
]

const EXTENDED_WEEK = [
  { key: '2026-03-09', label: 'Mon 3/9' },
  { key: '2026-03-10', label: 'Tue 3/10' },
  { key: '2026-03-11', label: 'Wed 3/11' },
  { key: '2026-03-12', label: 'Thu 3/12' },
  { key: '2026-03-13', label: 'Fri 3/13' },
  { key: '2026-03-14', label: 'Sat 3/14' },
  { key: '2026-03-15', label: 'Sun 3/15' },
]

export default function CalendarPage() {
  const [week, setWeek] = useState(0)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [filters, setFilters] = useState<Set<EventCategory>>(new Set())

  const days = week === 0 ? WEEK_DAYS : EXTENDED_WEEK

  const toggleFilter = (cat: EventCategory) => {
    setFilters(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  const eventsForDay = (date: string) =>
    calendarEvents.filter(e =>
      e.date === date &&
      (filters.size === 0 || filters.has(e.category))
    )

  const totalJobs = calendarEvents.filter(e => e.category === 'job').length
  const totalEstimates = calendarEvents.filter(e => e.category === 'estimate').length

  return (
    <div className="px-0 py-0">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-200 flex items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-[10px] tracking-[3px] uppercase text-sky-600">Calendar</h1>
          <p className="text-slate-500 text-[10px]">{totalJobs} jobs &middot; {totalEstimates} estimates scheduled</p>
        </div>
        <div className="flex-1" />

        {/* Category filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {(Object.entries(CATEGORY_STYLES) as [EventCategory, typeof CATEGORY_STYLES[EventCategory]][]).map(([key, style]) => (
            <button
              key={key}
              onClick={() => toggleFilter(key)}
              className={`text-[10px] px-2.5 py-1 rounded border transition-colors ${
                filters.has(key)
                  ? `${style.bg} border-current`
                  : 'bg-transparent border-slate-200 text-slate-500 hover:text-slate-600'
              }`}
              style={filters.has(key) ? { color: style.color } : {}}
            >
              {style.label}
            </button>
          ))}
          {filters.size > 0 && (
            <button onClick={() => setFilters(new Set())} className="text-[10px] text-slate-500 hover:text-slate-600">
              clear
            </button>
          )}
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeek(0)}
            className={`text-[10px] px-2.5 py-1 rounded border transition-colors ${week === 0 ? 'bg-sky-50 border-sky-400 text-sky-600' : 'border-slate-200 text-slate-500 hover:text-slate-600'}`}
          >
            Mar 2–8
          </button>
          <button
            onClick={() => setWeek(1)}
            className={`text-[10px] px-2.5 py-1 rounded border transition-colors ${week === 1 ? 'bg-sky-50 border-sky-400 text-sky-600' : 'border-slate-200 text-slate-500 hover:text-slate-600'}`}
          >
            Mar 9–15
          </button>
        </div>
      </div>

      {/* Weekly grid */}
      <div className="p-4">
        <div className="grid grid-cols-7 gap-2 min-w-[900px]">
          {days.map(day => {
            const events = eventsForDay(day.key)
            const isToday = day.key === '2026-03-05'
            return (
              <div key={day.key} className={`flex flex-col min-h-[280px]`}>
                {/* Day header */}
                <div className={`text-center text-[11px] font-semibold mb-2 pb-1 border-b ${isToday ? 'text-sky-600 border-[#00f5ff]/40' : 'text-slate-500 border-slate-200'}`}>
                  {day.label}
                  {isToday && <span className="ml-1 text-[9px] text-sky-600 opacity-70">today</span>}
                </div>

                {/* Events */}
                <div className="space-y-1.5 flex-1">
                  {events.length === 0 && (
                    <div className="text-[#2d1060] text-[10px] text-center pt-6">—</div>
                  )}
                  {events.map(event => {
                    const style = CATEGORY_STYLES[event.category]
                    return (
                      <button
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className={`w-full text-left px-2 py-1.5 rounded border text-[10px] leading-snug transition-opacity hover:opacity-90 ${style.bg}`}
                        style={{ color: style.color }}
                      >
                        <div className="font-semibold truncate">{event.time && `${event.time} `}{event.title}</div>
                        {event.assignee && (
                          <div className="mt-0.5 opacity-60 truncate">{event.assignee}</div>
                        )}
                        <div className="mt-0.5">
                          <span className={`text-[9px] uppercase tracking-wide opacity-50`}>
                            {event.status}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-slate-200">
          {(Object.entries(CATEGORY_STYLES) as [EventCategory, typeof CATEGORY_STYLES[EventCategory]][]).map(([key, style]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: style.color + '33', border: `1px solid ${style.color}44` }} />
              <span className="text-[10px] text-slate-500">{style.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Event detail modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-xl p-6 max-w-md w-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className={`text-[10px] px-2 py-0.5 rounded border ${CATEGORY_STYLES[selectedEvent.category].bg} mb-2 inline-block`}
                  style={{ color: CATEGORY_STYLES[selectedEvent.category].color }}>
                  {CATEGORY_STYLES[selectedEvent.category].label}
                </span>
                <h3 className="text-sm font-semibold text-slate-900 leading-snug">{selectedEvent.title}</h3>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="text-slate-500 hover:text-slate-600 text-sm ml-4 shrink-0">✕</button>
            </div>
            <div className="space-y-3 text-xs">
              <Row label="Date">{selectedEvent.date} at {selectedEvent.time}</Row>
              {selectedEvent.duration > 0 && <Row label="Duration">{selectedEvent.duration} min</Row>}
              <Row label="Status">
                <span className={`${selectedEvent.status === 'confirmed' ? 'text-emerald-600' : selectedEvent.status === 'completed' ? 'text-slate-500' : 'text-amber-500'}`}>
                  {selectedEvent.status}
                </span>
              </Row>
              {selectedEvent.assignee && <Row label="Assigned to">{selectedEvent.assignee}</Row>}
              {selectedEvent.location && <Row label="Location">{selectedEvent.location}</Row>}
              <Row label="Details"><span className="text-slate-500">{selectedEvent.description}</span></Row>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="text-slate-500 shrink-0 w-20">{label}</span>
      <span className="text-slate-600">{children}</span>
    </div>
  )
}
