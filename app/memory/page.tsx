'use client'

// Memory — Searchable operational knowledge vault.
// Convex-ready: swap memories array with useQuery hook.

import { useState } from 'react'
import { memories, type Memory, type MemoryCategory } from '@/lib/data'

const CATEGORIES: MemoryCategory[] = ['Customers', 'Jobs', 'Sales', 'Operations', 'Team', 'Vendors', 'Automations', 'Finance']

const CATEGORY_STYLES: Record<MemoryCategory, { color: string; accent: string }> = {
  Customers: { color: '#00f5ff', accent: 'border-sky-300 hover:border-[#00f5ff]/40' },
  Jobs: { color: '#00ff88', accent: 'border-emerald-300 hover:border-[#00ff88]/40' },
  Sales: { color: '#d070ff', accent: 'border-violet-300 hover:border-[#c040ff]/40' },
  Operations: { color: '#ff6600', accent: 'border-orange-300 hover:border-[#ff6600]/40' },
  Team: { color: '#ffee00', accent: 'border-amber-300 hover:border-[#ffee00]/40' },
  Vendors: { color: '#fb7185', accent: 'border-rose-300 hover:border-[#fb7185]/40' },
  Automations: { color: '#34d399', accent: 'border-emerald-300 hover:border-[#34d399]/40' },
  Finance: { color: '#60a5fa', accent: 'border-blue-300 hover:border-[#60a5fa]/40' },
}

export default function MemoryPage() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<MemoryCategory | 'All'>('All')
  const [selected, setSelected] = useState<Memory | null>(null)

  const filtered = memories.filter(m => {
    const matchCat = activeCategory === 'All' || m.category === activeCategory
    const matchSearch = search === '' ||
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.summary.toLowerCase().includes(search.toLowerCase()) ||
      m.tags.some(t => t.includes(search.toLowerCase()))
    return matchCat && matchSearch
  })

  const countFor = (cat: MemoryCategory) => memories.filter(m => m.category === cat).length

  return (
    <div className="flex">
      {/* Left: category sidebar */}
      <div className="w-44 shrink-0 border-r border-slate-200 py-4 px-3 space-y-0.5">
        <p className="text-[9px] tracking-widest uppercase text-slate-400 mb-3 px-2">Categories</p>
        <button
          onClick={() => setActiveCategory('All')}
          className={`w-full text-left text-xs px-2 py-1.5 rounded transition-colors flex items-center justify-between ${activeCategory === 'All' ? 'bg-sky-50 text-sky-600' : 'text-slate-500 hover:text-slate-600 hover:bg-slate-50'}`}
        >
          <span>All</span>
          <span className="text-[10px] text-slate-400">{memories.length}</span>
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`w-full text-left text-xs px-2 py-1.5 rounded transition-colors flex items-center justify-between ${activeCategory === cat ? 'bg-slate-100 font-medium' : 'text-slate-500 hover:text-slate-600 hover:bg-slate-50'}`}
            style={activeCategory === cat ? { color: CATEGORY_STYLES[cat].color } : {}}
          >
            <span>{cat}</span>
            <span className="text-[10px] text-slate-400">{countFor(cat)}</span>
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="px-5 py-3 border-b border-slate-200 flex items-center gap-3">
          <div>
            <h1 className="text-[10px] tracking-[3px] uppercase text-sky-600">Memory Vault</h1>
            <p className="text-slate-500 text-[10px]">{filtered.length} entries &mdash; operational knowledge base</p>
          </div>
          <div className="flex-1" />
          <input
            type="text"
            placeholder="Search memory..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-slate-100 border border-slate-200 text-slate-600 text-xs px-3 py-1.5 rounded outline-none focus:border-[#6040a0] placeholder:text-slate-500 w-56"
          />
        </div>

        {/* Memory grid */}
        <div className="flex-1 p-5">
          {filtered.length === 0 ? (
            <div className="text-slate-400 text-sm text-center py-16">No memories match your search.</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {filtered.map(memory => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  isSelected={selected?.id === memory.id}
                  onClick={() => setSelected(selected?.id === memory.id ? null : memory)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-80 border-l border-slate-200 flex flex-col bg-slate-50">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <span className="text-[10px] tracking-widest uppercase text-slate-500">Memory Detail</span>
            <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-slate-600 text-sm">✕</button>
          </div>
          <div className="flex-1 px-4 py-4 space-y-4 text-xs">
            <div>
              <span
                className="text-[10px] px-2 py-0.5 rounded border inline-block mb-2"
                style={{
                  color: CATEGORY_STYLES[selected.category].color,
                  backgroundColor: CATEGORY_STYLES[selected.category].color + '15',
                  borderColor: CATEGORY_STYLES[selected.category].color + '30',
                }}
              >
                {selected.category}
              </span>
              <p className="text-slate-900 font-semibold leading-snug">{selected.title}</p>
            </div>
            <div>
              <p className="text-sky-600 text-[10px] uppercase tracking-wide mb-2">Summary</p>
              <p className="text-slate-500 leading-relaxed">{selected.summary}</p>
            </div>
            <div>
              <p className="text-sky-600 text-[10px] uppercase tracking-wide mb-1">Tags</p>
              <div className="flex flex-wrap gap-1">
                {selected.tags.map(tag => (
                  <span key={tag} className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded border border-slate-200">{tag}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sky-600 text-[10px] uppercase tracking-wide mb-1">Source</p>
              <p className="text-slate-500">{selected.source}</p>
            </div>
            <div>
              <p className="text-sky-600 text-[10px] uppercase tracking-wide mb-1">Updated</p>
              <p className="text-slate-500">{new Date(selected.updatedAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MemoryCard({ memory, isSelected, onClick }: { memory: Memory; isSelected: boolean; onClick: () => void }) {
  const style = CATEGORY_STYLES[memory.category]
  return (
    <button
      onClick={onClick}
      className={`text-left bg-white border rounded-lg p-4 transition-colors ${isSelected ? 'border-current' : `border-slate-200 ${style.accent}`}`}
      style={isSelected ? { borderColor: style.color + '60' } : {}}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span
          className="text-[9px] px-1.5 py-0.5 rounded border inline-block uppercase tracking-wide"
          style={{ color: style.color, backgroundColor: style.color + '12', borderColor: style.color + '28' }}
        >
          {memory.category}
        </span>
        <span className="text-[10px] text-slate-400">{new Date(memory.updatedAt).toLocaleDateString()}</span>
      </div>
      <p className="text-xs font-semibold text-slate-900 mb-1.5 leading-snug">{memory.title}</p>
      <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-3">{memory.summary}</p>
      <div className="flex flex-wrap gap-1 mt-3">
        {memory.tags.slice(0, 4).map(tag => (
          <span key={tag} className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">{tag}</span>
        ))}
        {memory.tags.length > 4 && (
          <span className="text-[9px] text-slate-400">+{memory.tags.length - 4}</span>
        )}
      </div>
    </button>
  )
}
