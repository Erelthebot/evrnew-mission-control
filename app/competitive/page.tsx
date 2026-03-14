'use client'

import { useState } from 'react'

let liveData: any = {}
try { liveData = require('@/lib/data/live.json') } catch {}

function parseSections(md: string): { title: string; body: string }[] {
  if (!md) return []
  const parts = md.split(/^## /m)
  const sections: { title: string; body: string }[] = []
  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const newlineIdx = trimmed.indexOf('\n')
    if (newlineIdx === -1) {
      sections.push({ title: trimmed, body: '' })
    } else {
      sections.push({
        title: trimmed.slice(0, newlineIdx).trim(),
        body: trimmed.slice(newlineIdx + 1).trim(),
      })
    }
  }
  return sections
}

function getSummaryLine(content: string): string {
  if (!content) return ''
  const lines = content.split('\n').filter(l => l.trim())
  for (const line of lines) {
    if (!line.startsWith('#')) return line.trim().slice(0, 200)
  }
  return ''
}

export default function CompetitivePage() {
  const competitive = liveData.competitive || { content: '', generatedAt: null }
  const content: string = competitive.content || ''
  const generatedAt = competitive.generatedAt ? new Date(competitive.generatedAt).toLocaleString() : null

  if (!content) {
    return (
      <div className="px-5 py-6 max-w-4xl mx-auto">
        <h1 className="text-[10px] tracking-[3px] uppercase text-sky-600 font-bold mb-1">Competitive Intel</h1>
        <p className="text-xs text-slate-500 mb-8">Daily competitive intelligence from the Competitive Intel Agent</p>
        <EmptyState label="No competitive intelligence report available. The Competitive Intelligence Agent runs daily at 6:00 AM." />
      </div>
    )
  }

  const sections = parseSections(content)
  const summary = getSummaryLine(content)

  return (
    <div className="px-5 py-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[10px] tracking-[3px] uppercase text-sky-600 font-bold mb-1">Competitive Intel</h1>
          <p className="text-xs text-slate-500">PNW insulation market — competitor monitoring</p>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="bg-cyan-50 border border-cyan-200 text-cyan-600 px-3 py-1.5 rounded font-mono">
            Competitive Intelligence Agent
          </span>
          {generatedAt && (
            <span className="bg-slate-50 border border-slate-200 text-slate-500 px-3 py-1.5 rounded font-mono">
              {generatedAt}
            </span>
          )}
        </div>
      </div>

      {/* Summary banner */}
      {summary && (
        <div className="bg-cyan-50 border border-cyan-200 rounded-lg px-4 py-3">
          <p className="text-[11px] font-semibold text-cyan-700 mb-0.5 uppercase tracking-widest text-[9px]">Summary</p>
          <p className="text-sm text-cyan-900">{summary}</p>
        </div>
      )}

      {/* Sections */}
      {sections.length > 0 ? (
        <div className="space-y-3">
          {sections.map((section, i) => (
            <CollapsibleSection key={i} title={section.title} body={section.body} defaultOpen={i === 0} />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">{content}</pre>
        </div>
      )}
    </div>
  )
}

function CollapsibleSection({ title, body, defaultOpen }: { title: string; body: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false)

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="text-sm font-semibold text-slate-800">{title}</span>
        <span className="text-slate-400 text-xs ml-2 shrink-0">{open ? '▲' : '▼'}</span>
      </button>
      {open && body && (
        <div className="px-4 pb-4 border-t border-slate-100">
          <div className="text-[12px] text-slate-600 leading-relaxed pt-3 space-y-1">
            {body.split('\n').map((line, i) => {
              if (line.startsWith('### ')) {
                return <p key={i} className="font-semibold text-cyan-700 mt-2">{line.replace('### ', '')}</p>
              }
              if (line.startsWith('- ') || line.startsWith('* ')) {
                return <p key={i} className="ml-3">• {line.slice(2)}</p>
              }
              if (line.startsWith('**') && line.endsWith('**')) {
                return <p key={i} className="font-semibold text-slate-800">{line.replace(/\*\*/g, '')}</p>
              }
              return <p key={i}>{line}</p>
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 text-slate-400 text-xl">◎</div>
      <p className="text-sm text-slate-500 max-w-sm">{label}</p>
    </div>
  )
}
