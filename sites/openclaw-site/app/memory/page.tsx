'use client'

// Memory — Searchable operational knowledge vault.
// Convex-ready: swap memories array with useQuery hook.

import { useState } from 'react'
import { memories, type Memory, type MemoryCategory } from '@/lib/data'

const CATEGORIES: MemoryCategory[] = ['Customers', 'Jobs', 'Sales', 'Operations', 'Team', 'Vendors', 'Automations', 'Finance']

const CATEGORY_STYLES: Record<MemoryCategory, { color: string; accent: string }> = {
  Customers: { color: '#00e5ff', accent: 'border-[#00e5ff]/20 hover:border-[#00e5ff]/40' },
  Jobs: { color: '#22c55e', accent: 'border-[#22c55e]/20 hover:border-[#22c55e]/40' },
  Sales: { color: '#a78bfa', accent: 'border-[#7c3aed]/20 hover:border-[#7c3aed]/40' },
  Operations: { color: '#f97316', accent: 'border-[#f97316]/20 hover:border-[#f97316]/40' },
  Team: { color: '#facc15', accent: 'border-[#facc15]/20 hover:border-[#facc15]/40' },
  Vendors: { color: '#fb7185', accent: 'border-[#fb7185]/20 hover:border-[#fb7185]/40' },
  Automations: { color: '#34d399', accent: 'border-[#34d399]/20 hover:border-[#34d399]/40' },
  Finance: { color: '#60a5fa', accent: 'border-[#60a5fa]/20 hover:border-[#60a5fa]/40' },
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
    <div className="flex h-full">
      {/* Left: category sidebar */}
      <div className="w-44 shrink-0 border-r border-[#2a2a2a] py-4 px-3 space-y-0.5">
        <p className="text-[9px] tracking-widest uppercase text-[#333] mb-3 px-2">Categories</p>
        <button
          onClick={() => setActiveCategory('All')}
          className={`w-full text-left text-xs px-2 py-1.5 rounded transition-colors flex items-center justify-between ${activeCategory === 'All' ? 'bg-[#00e5ff]/8 text-[#00e5ff]' : 'text-[#555] hover:text-[#888] hover:bg-white/3'}`}
        >
          <span>All</span>
          <span className="text-[10px] text-[#333]">{memories.length}</span>
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`w-full text-left text-xs px-2 py-1.5 rounded transition-colors flex items-center justify-between ${activeCategory === cat ? 'bg-white/5 font-medium' : 'text-[#555] hover:text-[#888] hover:bg-white/3'}`}
            style={activeCategory === cat ? { color: CATEGORY_STYLES[cat].color } : {}}
          >
            <span>{cat}</span>
            <span className="text-[10px] text-[#333]">{countFor(cat)}</span>
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="px-5 py-3 border-b border-[#2a2a2a] flex items-center gap-3">
          <div>
            <h1 className="text-[10px] tracking-[3px] uppercase text-[#00e5ff]">Memory Vault</h1>
            <p className="text-[#444] text-[10px]">{filtered.length} entries &mdash; operational knowledge base</p>
          </div>
          <div className="flex-1" />
          <input
            type="text"
            placeholder="Search memory..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-[#1e1e1e] border border-[#2a2a2a] text-[#aaa] text-xs px-3 py-1.5 rounded outline-none focus:border-[#444] placeholder:text-[#444] w-56"
          />
        </div>

        {/* Memory grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {filtered.length === 0 ? (
            <div className="text-[#333] text-sm text-center py-16">No memories match your search.</div>
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
        <div className="w-80 border-l border-[#2a2a2a] flex flex-col bg-[#0f0f0f]">
          <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center justify-between">
            <span className="text-[10px] tracking-widest uppercase text-[#444]">Memory Detail</span>
            <button onClick={() => setSelected(null)} className="text-[#444] hover:text-[#888] text-sm">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 text-xs">
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
              <p className="text-[#e8e8e8] font-semibold leading-snug">{selected.title}</p>
            </div>
            <div>
              <p className="text-[#00e5ff] text-[10px] uppercase tracking-wide mb-2">Summary</p>
              <p className="text-[#777] leading-relaxed">{selected.summary}</p>
            </div>
            <div>
              <p className="text-[#00e5ff] text-[10px] uppercase tracking-wide mb-1">Tags</p>
              <div className="flex flex-wrap gap-1">
                {selected.tags.map(tag => (
                  <span key={tag} className="bg-[#1e1e1e] text-[#555] text-[10px] px-2 py-0.5 rounded border border-[#2a2a2a]">{tag}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[#00e5ff] text-[10px] uppercase tracking-wide mb-1">Source</p>
              <p className="text-[#555]">{selected.source}</p>
            </div>
            <div>
              <p className="text-[#00e5ff] text-[10px] uppercase tracking-wide mb-1">Updated</p>
              <p className="text-[#444]">{new Date(selected.updatedAt).toLocaleDateString()}</p>
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
      className={`text-left bg-[#161616] border rounded-lg p-4 transition-colors ${isSelected ? 'border-current' : `border-[#2a2a2a] ${style.accent}`}`}
      style={isSelected ? { borderColor: style.color + '60' } : {}}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span
          className="text-[9px] px-1.5 py-0.5 rounded border inline-block uppercase tracking-wide"
          style={{ color: style.color, backgroundColor: style.color + '12', borderColor: style.color + '28' }}
        >
          {memory.category}
        </span>
        <span className="text-[10px] text-[#333]">{new Date(memory.updatedAt).toLocaleDateString()}</span>
      </div>
      <p className="text-xs font-semibold text-[#e8e8e8] mb-1.5 leading-snug">{memory.title}</p>
      <p className="text-[11px] text-[#555] leading-relaxed line-clamp-3">{memory.summary}</p>
      <div className="flex flex-wrap gap-1 mt-3">
        {memory.tags.slice(0, 4).map(tag => (
          <span key={tag} className="text-[9px] bg-[#1e1e1e] text-[#444] px-1.5 py-0.5 rounded border border-[#252525]">{tag}</span>
        ))}
        {memory.tags.length > 4 && (
          <span className="text-[9px] text-[#333]">+{memory.tags.length - 4}</span>
        )}
      </div>
    </button>
  )
}
