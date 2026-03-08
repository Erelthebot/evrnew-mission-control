'use client'

import { useState } from 'react'

let liveData: any = {}
try { liveData = require('@/lib/data/live.json') } catch {}

export default function EmailDripPage() {
  const emailDrip = liveData.emailDrip || { sequences: [], generatedAt: null }
  const sequences: any[] = emailDrip.sequences || []
  const generatedAt = emailDrip.generatedAt ? new Date(emailDrip.generatedAt).toLocaleString() : null

  return (
    <div className="px-5 py-6 max-w-5xl mx-auto space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[10px] tracking-[3px] uppercase text-sky-600 font-bold mb-1">Email Drip</h1>
          <p className="text-xs text-slate-500">{sequences.length} email sequence{sequences.length !== 1 ? 's' : ''} from the Email Drip Agent</p>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="bg-red-50 border border-red-200 text-red-600 px-3 py-1.5 rounded font-mono">
            Email Drip Agent
          </span>
          {generatedAt && (
            <span className="bg-slate-50 border border-slate-200 text-slate-500 px-3 py-1.5 rounded font-mono">
              {generatedAt}
            </span>
          )}
        </div>
      </div>

      {sequences.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 text-slate-400 text-xl">≈</div>
          <p className="text-sm text-slate-500 max-w-sm">
            No email sequences available. The Email Drip Agent runs weekly on Tuesdays at 9:00 AM and generates 5-email nurture sequences.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sequences.map((seq: any, i: number) => (
            <SequenceCard key={i} seq={seq} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}

function SequenceCard({ seq, index }: { seq: any; index: number }) {
  const [open, setOpen] = useState(index === 0)
  const emails: any[] = seq.emails || seq.steps || []

  return (
    <div className="bg-white border border-violet-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 bg-violet-50 border-b border-violet-200 text-left hover:bg-violet-100 transition-colors"
      >
        <div>
          <p className="text-sm font-bold text-violet-800">{seq.sequence_name || seq.name || `Sequence ${index + 1}`}</p>
          {seq.target_audience && (
            <p className="text-[10px] text-violet-600 mt-0.5">{seq.target_audience}</p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[10px] bg-violet-100 text-violet-700 border border-violet-300 px-2 py-0.5 rounded font-mono">
            {emails.length} emails
          </span>
          <span className="text-slate-400 text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </button>
      {open && (
        <div className="divide-y divide-slate-100">
          {emails.length === 0 && (
            <p className="px-5 py-4 text-[11px] text-slate-400 italic">No emails in this sequence</p>
          )}
          {emails.map((email: any, j: number) => (
            <EmailCard key={j} email={email} index={j} />
          ))}
        </div>
      )}
    </div>
  )
}

function EmailCard({ email, index }: { email: any; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const body: string = email.body || email.body_text || email.content || ''
  const hasBody = body.length > 0

  return (
    <div className="px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="text-[10px] bg-violet-100 text-violet-700 border border-violet-300 px-2 py-1 rounded font-mono shrink-0 mt-0.5">
          Day {email.day || index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-slate-800">{email.subject || email.subject_line || `Email ${index + 1}`}</p>
          {email.preview_text && (
            <p className="text-[10px] text-slate-500 mt-0.5">{email.preview_text}</p>
          )}
          {hasBody && (
            <>
              <p className={`text-[11px] text-slate-600 mt-2 leading-relaxed ${!expanded ? 'line-clamp-3' : ''}`}>
                {body}
              </p>
              {body.length > 200 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-[10px] text-sky-600 hover:underline mt-1"
                >
                  {expanded ? 'Show less' : 'Show full email'}
                </button>
              )}
            </>
          )}
          {email.cta && (
            <p className="text-[10px] text-violet-600 font-medium mt-2">CTA: {email.cta}</p>
          )}
        </div>
      </div>
    </div>
  )
}
