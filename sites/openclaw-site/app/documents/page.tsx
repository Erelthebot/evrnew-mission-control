'use client'

// Documents — Searchable internal document repository.
// Convex-ready: swap documents array with useQuery hook.

import { useState } from 'react'
import { documents, type Document, type DocType } from '@/lib/data'

const TYPE_STYLES: Record<DocType, { label: string; color: string }> = {
  estimate: { label: 'Estimate', color: '#00e5ff' },
  sow: { label: 'SOW', color: '#a78bfa' },
  sop: { label: 'SOP', color: '#22c55e' },
  proposal: { label: 'Proposal', color: '#f97316' },
  invoice: { label: 'Invoice', color: '#facc15' },
  contract: { label: 'Contract', color: '#fb7185' },
  rebate: { label: 'Rebate', color: '#34d399' },
  training: { label: 'Training', color: '#60a5fa' },
  script: { label: 'Script', color: '#c084fc' },
  marketing: { label: 'Marketing', color: '#f472b6' },
}

const DOC_TYPES = Object.keys(TYPE_STYLES) as DocType[]

export default function DocumentsPage() {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<DocType | 'all'>('all')
  const [selected, setSelected] = useState<Document | null>(null)

  const filtered = documents.filter(d => {
    const matchType = filterType === 'all' || d.type === filterType
    const matchSearch = search === '' ||
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.preview.toLowerCase().includes(search.toLowerCase()) ||
      d.tags.some(t => t.includes(search.toLowerCase()))
    return matchType && matchSearch
  })

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="px-5 py-3 border-b border-[#2a2a2a] flex items-center gap-3 flex-wrap">
          <div>
            <h1 className="text-[10px] tracking-[3px] uppercase text-[#00e5ff]">Documents</h1>
            <p className="text-[#444] text-[10px]">{documents.length} documents &mdash; estimates, SOPs, proposals &amp; more</p>
          </div>
          <div className="flex-1" />
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-[#1e1e1e] border border-[#2a2a2a] text-[#aaa] text-xs px-3 py-1.5 rounded outline-none focus:border-[#444] placeholder:text-[#444] w-56"
          />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as DocType | 'all')}
            className="bg-[#1e1e1e] border border-[#2a2a2a] text-[#aaa] text-xs px-2 py-1.5 rounded outline-none"
          >
            <option value="all">All types</option>
            {DOC_TYPES.map(t => (
              <option key={t} value={t}>{TYPE_STYLES[t].label}</option>
            ))}
          </select>
        </div>

        {/* Type filter pills */}
        <div className="px-5 py-2 border-b border-[#2a2a2a] flex gap-2 overflow-x-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`shrink-0 text-[10px] px-2.5 py-1 rounded border transition-colors ${filterType === 'all' ? 'bg-[#00e5ff]/10 border-[#00e5ff]/30 text-[#00e5ff]' : 'border-[#2a2a2a] text-[#444] hover:text-[#666]'}`}
          >
            All ({documents.length})
          </button>
          {DOC_TYPES.map(t => {
            const count = documents.filter(d => d.type === t).length
            if (count === 0) return null
            const style = TYPE_STYLES[t]
            return (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`shrink-0 text-[10px] px-2.5 py-1 rounded border transition-colors ${filterType === t ? 'border-current' : 'border-[#2a2a2a] text-[#444] hover:text-[#666]'}`}
                style={filterType === t ? { color: style.color, backgroundColor: style.color + '12', borderColor: style.color + '30' } : {}}
              >
                {style.label} ({count})
              </button>
            )
          })}
        </div>

        {/* Document list */}
        <div className="flex-1 overflow-y-auto p-5">
          {filtered.length === 0 ? (
            <div className="text-[#333] text-sm text-center py-16">No documents found.</div>
          ) : (
            <div className="space-y-2">
              {filtered.map(doc => (
                <DocRow
                  key={doc.id}
                  doc={doc}
                  isSelected={selected?.id === doc.id}
                  onClick={() => setSelected(selected?.id === doc.id ? null : doc)}
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
            <span className="text-[10px] tracking-widest uppercase text-[#444]">Document Detail</span>
            <button onClick={() => setSelected(null)} className="text-[#444] hover:text-[#888] text-sm">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 text-xs">
            <div>
              <TypeBadge type={selected.type} />
              <p className="text-[#e8e8e8] font-semibold text-sm leading-snug mt-2">{selected.title}</p>
            </div>
            <div>
              <p className="text-[#00e5ff] text-[10px] uppercase tracking-wide mb-1">Preview</p>
              <p className="text-[#666] leading-relaxed">{selected.preview}</p>
            </div>
            <div>
              <p className="text-[#00e5ff] text-[10px] uppercase tracking-wide mb-1">Category</p>
              <p className="text-[#aaa]">{selected.category}</p>
            </div>
            <div>
              <p className="text-[#00e5ff] text-[10px] uppercase tracking-wide mb-1">Owner</p>
              <p className="text-[#aaa]">{selected.owner}</p>
            </div>
            <div>
              <p className="text-[#00e5ff] text-[10px] uppercase tracking-wide mb-1">Tags</p>
              <div className="flex flex-wrap gap-1">
                {selected.tags.map(tag => (
                  <span key={tag} className="bg-[#1e1e1e] text-[#555] text-[10px] px-2 py-0.5 rounded border border-[#2a2a2a]">{tag}</span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[#00e5ff] text-[10px] uppercase tracking-wide mb-1">Created</p>
                <p className="text-[#444]">{new Date(selected.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-[#00e5ff] text-[10px] uppercase tracking-wide mb-1">Updated</p>
                <p className="text-[#444]">{new Date(selected.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DocRow({ doc, isSelected, onClick }: { doc: Document; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-[#161616] border rounded-lg px-4 py-3 transition-colors hover:border-[#3a3a3a] flex items-start gap-4 ${
        isSelected ? 'border-[#00e5ff]/30' : 'border-[#2a2a2a]'
      }`}
    >
      {/* Icon */}
      <div
        className="w-8 h-8 rounded flex items-center justify-center shrink-0 text-[11px] font-bold"
        style={{
          backgroundColor: TYPE_STYLES[doc.type].color + '12',
          color: TYPE_STYLES[doc.type].color,
        }}
      >
        {TYPE_STYLES[doc.type].label.slice(0, 2).toUpperCase()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-xs font-semibold text-[#e8e8e8] truncate">{doc.title}</p>
        </div>
        <p className="text-[11px] text-[#555] truncate">{doc.preview}</p>
        <div className="flex items-center gap-3 mt-1.5">
          <TypeBadge type={doc.type} size="xs" />
          <span className="text-[10px] text-[#333]">{doc.owner}</span>
          <span className="text-[10px] text-[#333]">{new Date(doc.updatedAt).toLocaleDateString()}</span>
          <div className="flex gap-1">
            {doc.tags.slice(0, 2).map(tag => (
              <span key={tag} className="text-[9px] bg-[#1e1e1e] text-[#444] px-1.5 py-0.5 rounded">{tag}</span>
            ))}
          </div>
        </div>
      </div>
    </button>
  )
}

function TypeBadge({ type, size = 'sm' }: { type: DocType; size?: 'xs' | 'sm' }) {
  const style = TYPE_STYLES[type]
  const sizeClass = size === 'xs' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'
  return (
    <span
      className={`rounded border ${sizeClass} font-medium`}
      style={{ color: style.color, backgroundColor: style.color + '12', borderColor: style.color + '28' }}
    >
      {style.label}
    </span>
  )
}
