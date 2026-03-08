'use client'

import { useState } from 'react'

let liveData: any = {}
try { liveData = require('@/lib/data/live.json') } catch {}

const PLATFORM_STYLES: Record<string, { badge: string; heading: string }> = {
  facebook:       { badge: 'bg-blue-100 text-blue-700 border-blue-300',    heading: 'text-blue-600' },
  instagram:      { badge: 'bg-pink-100 text-pink-700 border-pink-300',    heading: 'text-pink-600' },
  google_business:{ badge: 'bg-emerald-100 text-emerald-700 border-emerald-300', heading: 'text-emerald-600' },
}

export default function SocialPage() {
  const social = liveData.social || { facebook: [], instagram: [], google_business: [], generatedAt: null }
  const generatedAt = social.generatedAt ? new Date(social.generatedAt).toLocaleString() : null

  const facebook: any[] = social.facebook || []
  const instagram: any[] = social.instagram || []
  const google_business: any[] = social.google_business || []

  const totalPosts = facebook.length + instagram.length + google_business.length
  const platforms = [facebook, instagram, google_business].filter(p => p.length > 0).length

  return (
    <div className="px-5 py-6 max-w-7xl mx-auto space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[10px] tracking-[3px] uppercase text-sky-600 font-bold mb-1">Social Media Monitor</h1>
          <p className="text-xs text-slate-500">
            {totalPosts} posts generated, {platforms} platform{platforms !== 1 ? 's' : ''} covered
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="bg-pink-50 border border-pink-200 text-pink-600 px-3 py-1.5 rounded font-mono">
            Social Media Agent
          </span>
          {generatedAt && (
            <span className="bg-slate-50 border border-slate-200 text-slate-500 px-3 py-1.5 rounded font-mono">
              {generatedAt}
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Facebook', count: facebook.length, style: PLATFORM_STYLES.facebook },
          { label: 'Instagram', count: instagram.length, style: PLATFORM_STYLES.instagram },
          { label: 'Google Business', count: google_business.length, style: PLATFORM_STYLES.google_business },
        ].map(p => (
          <div key={p.label} className="bg-white border border-slate-200 rounded-lg p-3 text-center">
            <span className={`text-[9px] px-2 py-0.5 rounded border font-bold uppercase ${p.style.badge}`}>{p.label}</span>
            <p className={`text-2xl font-bold mt-2 ${p.style.heading}`}>{p.count}</p>
            <p className="text-[10px] text-slate-400">posts</p>
          </div>
        ))}
      </div>

      {totalPosts === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <PlatformColumn
            platform="facebook"
            label="Facebook"
            posts={facebook}
          />
          <PlatformColumn
            platform="instagram"
            label="Instagram"
            posts={instagram}
          />
          <PlatformColumn
            platform="google_business"
            label="Google Business"
            posts={google_business}
          />
        </div>
      )}
    </div>
  )
}

function PlatformColumn({ platform, label, posts }: { platform: string; label: string; posts: any[] }) {
  const style = PLATFORM_STYLES[platform] || { badge: 'bg-slate-100 text-slate-600 border-slate-200', heading: 'text-slate-600' }

  return (
    <div>
      <h2 className={`text-[10px] tracking-widest uppercase font-bold mb-3 ${style.heading}`}>
        {label} — {posts.length} posts
      </h2>
      <div className="space-y-4">
        {posts.map((post: any, i: number) => (
          <SocialPostCard key={i} post={post} platform={platform} style={style} />
        ))}
        {posts.length === 0 && (
          <p className="text-[11px] text-slate-400 italic">No posts available</p>
        )}
      </div>
    </div>
  )
}

function SocialPostCard({ post, platform, style }: { post: any; platform: string; style: { badge: string; heading: string } }) {
  const [expanded, setExpanded] = useState(false)
  const caption: string = post.caption || ''
  const charLimit = platform === 'instagram' ? 220 : 300
  const hasMore = caption.length > charLimit

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden hover:shadow-sm transition-shadow">
      <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2">
        <span className={`text-[9px] px-2 py-0.5 rounded border font-bold uppercase shrink-0 ${style.badge}`}>
          {platform.replace('_', ' ')}
        </span>
        {post.topic && (
          <span className="text-[10px] text-slate-500 truncate">{post.topic}</span>
        )}
      </div>
      <div className="px-3 py-3">
        <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-line">
          {expanded ? caption : caption.slice(0, charLimit)}
          {!expanded && hasMore && '...'}
        </p>
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[10px] text-sky-600 hover:underline mt-1.5"
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        )}
        {post.suggested_image && (
          <div className="mt-2 pt-2 border-t border-slate-100">
            <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">Suggested Image</p>
            <p className="text-[10px] text-slate-500 italic">{post.suggested_image}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 text-slate-400 text-xl">⊞</div>
      <p className="text-sm text-slate-500 max-w-sm">
        No social posts available. The Social Media Agent runs daily at 8:00 AM and generates posts for Facebook, Instagram, and Google Business Profile.
      </p>
    </div>
  )
}
