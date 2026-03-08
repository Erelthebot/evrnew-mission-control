'use client'

import { useState } from 'react'

let liveData: any = {}
try { liveData = require('@/lib/data/live.json') } catch {}

type Tab = 'ads' | 'social' | 'email' | 'logs'

const VARIANT_COLORS: Record<string, string> = {
  A: 'bg-sky-100 text-sky-700 border-sky-300',
  B: 'bg-violet-100 text-violet-700 border-violet-300',
  C: 'bg-amber-100 text-amber-700 border-amber-300',
}

const PLATFORM_COLORS: Record<string, string> = {
  facebook: 'bg-blue-100 text-blue-700 border-blue-300',
  instagram: 'bg-pink-100 text-pink-700 border-pink-300',
  google_business: 'bg-emerald-100 text-emerald-700 border-emerald-300',
}

const AGENT_COLORS: Record<string, string> = {
  ads:          '#f59e0b',
  social:       '#ec4899',
  competitive:  '#00b4d8',
  strategy:     '#0ea5e9',
  blogSeo:      '#f97316',
  technicalSeo: '#10b981',
  emailDrip:    '#ef4444',
  content:      '#8b5cf6',
  inbox:        '#64748b',
  telegram:     '#0088cc',
  moltbook:     '#a855f7',
  health:       '#16a34a',
}

export default function MarketingPage() {
  const [tab, setTab] = useState<Tab>('ads')

  const ads = liveData.ads || { google: [], meta: [] }
  const social = liveData.social || { facebook: [], instagram: [], google_business: [] }
  const emailDrip = liveData.emailDrip || { sequences: [] }
  const agentLogs = liveData.agentLogs || {}
  const generatedAt = liveData.generatedAt ? new Date(liveData.generatedAt).toLocaleString() : 'Not yet generated'

  const googleCount = (ads.google || []).length
  const metaCount = (ads.meta || []).length
  const postsCount = (social.facebook?.length || 0) + (social.instagram?.length || 0) + (social.google_business?.length || 0)
  const seqCount = (emailDrip.sequences || []).length

  const tabs: { id: Tab; label: string }[] = [
    { id: 'ads', label: 'Ads' },
    { id: 'social', label: 'Social' },
    { id: 'email', label: 'Email Drip' },
    { id: 'logs', label: 'Log Feed' },
  ]

  return (
    <div className="px-5 py-6 max-w-7xl mx-auto space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[10px] tracking-[3px] uppercase text-sky-600 font-bold mb-1">Marketing Monitor</h1>
          <p className="text-xs text-slate-500">Live agent outputs — ads, social, email, logs</p>
        </div>
        <div className="text-[10px] text-slate-400 font-mono bg-slate-50 border border-slate-200 rounded px-3 py-1.5">
          Generated: {generatedAt}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Google Ad Groups', value: googleCount, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
          { label: 'Meta Ads', value: metaCount, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
          { label: 'Social Posts', value: postsCount, color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200' },
          { label: 'Email Sequences', value: seqCount, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
        ].map(s => (
          <div key={s.label} className={`rounded-lg p-3 border ${s.bg} ${s.border}`}>
            <p className={`text-[9px] uppercase tracking-widest font-bold mb-1 ${s.color}`}>{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-sky-500 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'ads' && <AdsTab ads={ads} />}
      {tab === 'social' && <SocialTab social={social} />}
      {tab === 'email' && <EmailTab emailDrip={emailDrip} />}
      {tab === 'logs' && <LogsTab agentLogs={agentLogs} />}
    </div>
  )
}

// ─── Ads Tab ──────────────────────────────────────────────────────────────────

function AdsTab({ ads }: { ads: any }) {
  const google: any[] = ads.google || []
  const meta: any[] = ads.meta || []

  if (google.length === 0 && meta.length === 0) {
    return <EmptyState label="No ad data available. Run the Ads Agent to generate ad copy." />
  }

  return (
    <div className="space-y-8">
      {google.length > 0 && (
        <section>
          <h2 className="text-[10px] tracking-[3px] uppercase text-amber-600 font-bold mb-3 pb-2 border-b border-slate-200">
            Google Ads — {google.length} Ad Groups
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {google.map((group: any, i: number) => (
              <GoogleAdCard key={i} group={group} />
            ))}
          </div>
        </section>
      )}
      {meta.length > 0 && (
        <section>
          <h2 className="text-[10px] tracking-[3px] uppercase text-blue-600 font-bold mb-3 pb-2 border-b border-slate-200">
            Meta Ads — {meta.length} Ads
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {meta.map((ad: any, i: number) => (
              <MetaAdCard key={i} ad={ad} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function GoogleAdCard({ group }: { group: any }) {
  const variants: any[] = group.variants || []
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-800 capitalize">{(group.ad_group || '').replace(/_/g, ' ')}</p>
          <p className="text-[10px] text-amber-600 font-mono">{group.city || ''}</p>
        </div>
        <span className="text-[9px] bg-amber-100 text-amber-700 border border-amber-300 px-2 py-0.5 rounded font-bold uppercase tracking-wide">
          Google
        </span>
      </div>
      <div className="divide-y divide-slate-100">
        {variants.map((v: any, i: number) => (
          <div key={i} className="px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${VARIANT_COLORS[v.variant] || 'bg-slate-100 text-slate-600 border-slate-300'}`}>
                {v.variant}
              </span>
              <span className="text-[10px] text-slate-400">{v.primary_hook}</span>
            </div>
            <div className="space-y-1">
              {[v.headline_1, v.headline_2, v.headline_3].filter(Boolean).map((h: string, j: number) => (
                <p key={j} className="text-[11px] text-slate-700 font-medium leading-snug">
                  {j === 0 ? '' : '| '}{h}
                </p>
              ))}
              {v.description_1 && <p className="text-[10px] text-slate-500 mt-1">{v.description_1}</p>}
              {v.description_2 && <p className="text-[10px] text-slate-400">{v.description_2}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MetaAdCard({ ad }: { ad: any }) {
  return (
    <div className="bg-white border border-blue-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      <div className="px-4 py-3 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
        <p className="text-xs font-bold text-slate-800 capitalize">{(ad.ad_type || ad.type || 'Meta Ad').replace(/_/g, ' ')}</p>
        <span className="text-[9px] bg-blue-100 text-blue-700 border border-blue-300 px-2 py-0.5 rounded font-bold uppercase tracking-wide">Meta</span>
      </div>
      <div className="px-4 py-3 space-y-2">
        {ad.headline && <p className="text-xs font-semibold text-slate-800">{ad.headline}</p>}
        {ad.primary_text && <p className="text-[11px] text-slate-600 leading-snug line-clamp-4">{ad.primary_text}</p>}
        {ad.description && <p className="text-[10px] text-slate-400">{ad.description}</p>}
        {ad.cta && (
          <span className="inline-block text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded font-medium">{ad.cta}</span>
        )}
      </div>
    </div>
  )
}

// ─── Social Tab ───────────────────────────────────────────────────────────────

function SocialTab({ social }: { social: any }) {
  const fb: any[] = social.facebook || []
  const ig: any[] = social.instagram || []
  const gbp: any[] = social.google_business || []

  if (fb.length === 0 && ig.length === 0 && gbp.length === 0) {
    return <EmptyState label="No social posts available. Run the Social Agent to generate posts." />
  }

  const platforms = [
    { key: 'facebook', label: 'Facebook', posts: fb, color: 'blue' },
    { key: 'instagram', label: 'Instagram', posts: ig, color: 'pink' },
    { key: 'google_business', label: 'Google Business', posts: gbp, color: 'emerald' },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {platforms.map(p => (
        <div key={p.key}>
          <h3 className={`text-[10px] tracking-widest uppercase font-bold mb-3 text-${p.color}-600`}>
            {p.label} — {p.posts.length} posts
          </h3>
          <div className="space-y-3">
            {p.posts.map((post: any, i: number) => (
              <SocialPostCard key={i} post={post} platform={p.key} />
            ))}
            {p.posts.length === 0 && (
              <p className="text-[11px] text-slate-400 italic">No posts available</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function SocialPostCard({ post, platform }: { post: any; platform: string }) {
  const [expanded, setExpanded] = useState(false)
  const caption: string = post.caption || ''
  const preview = caption.slice(0, 200)
  const hasMore = caption.length > 200

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-[9px] px-2 py-0.5 rounded border font-bold uppercase ${PLATFORM_COLORS[platform] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
          {platform.replace('_', ' ')}
        </span>
        {post.topic && (
          <span className="text-[10px] text-slate-500 truncate">{post.topic}</span>
        )}
      </div>
      <p className="text-[11px] text-slate-700 leading-snug whitespace-pre-line">
        {expanded ? caption : preview}
        {!expanded && hasMore && '...'}
      </p>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] text-sky-600 hover:underline mt-1"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
      {post.suggested_image && (
        <p className="text-[9px] text-slate-400 italic mt-2 border-t border-slate-100 pt-2">
          Image: {post.suggested_image.slice(0, 100)}
        </p>
      )}
    </div>
  )
}

// ─── Email Tab ────────────────────────────────────────────────────────────────

function EmailTab({ emailDrip }: { emailDrip: any }) {
  const sequences: any[] = emailDrip.sequences || []

  if (sequences.length === 0) {
    return <EmptyState label="No email sequences available. Run the Email Drip Agent to generate sequences." />
  }

  return (
    <div className="space-y-6">
      {sequences.map((seq: any, i: number) => (
        <div key={i} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-violet-50 border-b border-violet-200">
            <p className="text-xs font-bold text-violet-800">{seq.sequence_name || seq.name || `Sequence ${i + 1}`}</p>
            {seq.target_audience && (
              <p className="text-[10px] text-violet-600 mt-0.5">{seq.target_audience}</p>
            )}
          </div>
          <div className="divide-y divide-slate-100">
            {(seq.emails || seq.steps || []).map((email: any, j: number) => (
              <div key={j} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] bg-violet-100 text-violet-700 border border-violet-300 px-2 py-0.5 rounded font-mono">
                    Day {email.day || j + 1}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-700">{email.subject || email.subject_line || ''}</span>
                </div>
                {email.preview_text && (
                  <p className="text-[10px] text-slate-500">{email.preview_text}</p>
                )}
                {email.body_excerpt && (
                  <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{email.body_excerpt}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Log Feed Tab ─────────────────────────────────────────────────────────────

function LogsTab({ agentLogs }: { agentLogs: any }) {
  const agents = [
    { key: 'ads', label: 'Ads Agent' },
    { key: 'social', label: 'Social Agent' },
    { key: 'competitive', label: 'Competitive Intel' },
    { key: 'strategy', label: 'Strategy Agent' },
    { key: 'blogSeo', label: 'Blog & SEO' },
    { key: 'technicalSeo', label: 'Technical SEO' },
    { key: 'emailDrip', label: 'Email Drip' },
    { key: 'content', label: 'Content Agent' },
    { key: 'inbox', label: 'Inbox Monitor' },
    { key: 'telegram', label: 'Telegram Bot' },
    { key: 'moltbook', label: 'Moltbook' },
    { key: 'health', label: 'Health' },
  ]

  return (
    <div className="rounded-xl bg-slate-950 p-4 font-mono text-[11px] space-y-4 overflow-x-auto">
      {agents.map(({ key, label }) => {
        const lines: string[] = agentLogs[key] || []
        return (
          <div key={key}>
            <p className="mb-1" style={{ color: AGENT_COLORS[key] || '#94a3b8' }}>
              ▶ {label}
            </p>
            {lines.length === 0 ? (
              <p className="text-slate-600 ml-3">— no recent logs —</p>
            ) : (
              lines.map((line, i) => (
                <div key={i} className="text-slate-400 ml-3 leading-relaxed">{line}</div>
              ))
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 text-slate-400 text-xl">◆</div>
      <p className="text-sm text-slate-500 max-w-sm">{label}</p>
    </div>
  )
}
