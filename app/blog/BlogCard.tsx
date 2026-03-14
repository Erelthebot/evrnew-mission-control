'use client'

import Link from 'next/link'
import { BlogPost } from '@/lib/blog-posts'
import { useState } from 'react'

export default function BlogCard({ post }: { post: BlogPost }) {
  const [hovered, setHovered] = useState(false)

  return (
    <Link href={`/blog/${post.slug}`} style={{ textDecoration: 'none' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: '#fff',
          border: `1px solid ${hovered ? '#7dd3fc' : '#e2e8f0'}`,
          borderRadius: 10,
          padding: '24px 28px',
          transition: 'box-shadow 0.15s, border-color 0.15s',
          boxShadow: hovered ? '0 4px 20px rgba(14,165,233,0.08)' : 'none',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{
                background: '#f0f9ff',
                color: '#0284c7',
                fontSize: 10,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 4,
                letterSpacing: '0.05em'
              }}>
                {post.city.toUpperCase()}
              </span>
              <span style={{ color: '#94a3b8', fontSize: 11 }}>{post.date}</span>
            </div>
            <h2 style={{
              fontSize: 17,
              fontWeight: 700,
              color: '#1e293b',
              margin: '0 0 8px',
              lineHeight: 1.3,
              letterSpacing: '-0.01em'
            }}>
              {post.title}
            </h2>
            <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 12px', lineHeight: 1.5 }}>
              {post.metaDescription}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                color: '#475569',
                fontSize: 10,
                padding: '2px 8px',
                borderRadius: 4,
                fontFamily: 'monospace'
              }}>
                {post.targetKeyword}
              </span>
            </div>
          </div>
          <div style={{
            width: 32,
            height: 32,
            background: 'linear-gradient(135deg,#0ea5e9,#7c3aed)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: '#fff',
            fontSize: 14
          }}>
            →
          </div>
        </div>
      </div>
    </Link>
  )
}
