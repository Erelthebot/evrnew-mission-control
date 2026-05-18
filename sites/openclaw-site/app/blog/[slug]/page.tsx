import { blogPosts, getPostBySlug } from '@/lib/blog-posts'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export async function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return {}
  return {
    title: post.metaTitle,
    description: post.metaDescription,
  }
}

function renderContent(content: string) {
  const lines = content.trim().split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: '0 0 20px', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          {line.slice(2)}
        </h1>
      )
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: '36px 0 12px', letterSpacing: '-0.01em', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
          {line.slice(3)}
        </h2>
      )
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} style={{ fontSize: 16, fontWeight: 700, color: '#334155', margin: '24px 0 8px' }}>
          {line.slice(4)}
        </h3>
      )
    } else if (line.startsWith('---')) {
      elements.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '24px 0' }} />)
    } else if (line.startsWith('- ')) {
      const listItems: React.ReactNode[] = []
      while (i < lines.length && lines[i].startsWith('- ')) {
        const raw = lines[i].slice(2)
        listItems.push(
          <li key={i} style={{ color: '#475569', fontSize: 14, lineHeight: 1.7, marginBottom: 4 }}
            dangerouslySetInnerHTML={{ __html: raw.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }}
          />
        )
        i++
      }
      elements.push(<ul key={`ul-${i}`} style={{ margin: '12px 0', paddingLeft: 20 }}>{listItems}</ul>)
      continue
    } else if (line.startsWith('| ')) {
      const tableRows: string[] = []
      while (i < lines.length && lines[i].startsWith('| ')) {
        if (!lines[i].includes('---')) tableRows.push(lines[i])
        i++
      }
      const headers = tableRows[0]?.split('|').filter(c => c.trim()).map(c => c.trim()) || []
      const rows = tableRows.slice(1).map(r => r.split('|').filter(c => c.trim()).map(c => c.trim()))
      elements.push(
        <div key={`table-${i}`} style={{ overflowX: 'auto', margin: '20px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {headers.map((h, j) => (
                  <th key={j} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#1e293b' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{ border: '1px solid #e2e8f0', padding: '8px 12px', color: '#475569' }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      continue
    } else if (line.startsWith('**Best used in:**') || line.startsWith('**The trade-off:**') || line.startsWith('**Why it suits') || line.startsWith('**Best used') || line.startsWith('**R-value') || line.startsWith('**Important') || line.startsWith('**The honest') || line.startsWith('**The result')) {
      elements.push(
        <p key={i} style={{ color: '#475569', fontSize: 14, lineHeight: 1.7, margin: '8px 0' }}
          dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }}
        />
      )
    } else if (line.trim() !== '') {
      elements.push(
        <p key={i} style={{ color: '#475569', fontSize: 14, lineHeight: 1.7, margin: '12px 0' }}
          dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\.\.\./g, '&hellip;') }}
        />
      )
    }

    i++
  }

  return elements
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '32px 24px' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 28, fontSize: 12, color: '#94a3b8' }}>
        <Link href="/blog" style={{ color: '#0284c7', textDecoration: 'none', fontWeight: 500 }}>Blog</Link>
        <span>/</span>
        <span style={{ color: '#64748b' }}>{post.city}</span>
      </div>

      {/* Meta badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <span style={{
          background: '#f0f9ff',
          color: '#0284c7',
          fontSize: 10,
          fontWeight: 700,
          padding: '3px 10px',
          borderRadius: 4,
          letterSpacing: '0.05em'
        }}>
          {post.city.toUpperCase()}
        </span>
        <span style={{ color: '#94a3b8', fontSize: 11 }}>Published {post.date}</span>
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

      {/* Article content */}
      <article style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '36px 40px',
        marginBottom: 32
      }}>
        {renderContent(post.content)}
      </article>

      {/* CTA Card */}
      <div style={{
        background: 'linear-gradient(135deg, #0ea5e9 0%, #7c3aed 100%)',
        borderRadius: 12,
        padding: '28px 32px',
        color: '#fff',
        marginBottom: 24
      }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>Ready for a Free Inspection?</h3>
        <p style={{ margin: '0 0 16px', fontSize: 13, opacity: 0.9, lineHeight: 1.5 }}>
          Evrnew LLC serves all of King, Snohomish, and Skagit County. No pressure, no guesswork.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a href="https://evrnew.com" style={{
            background: '#fff',
            color: '#7c3aed',
            padding: '10px 20px',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 700,
            textDecoration: 'none'
          }}>
            Book Free Inspection
          </a>
          <a href="tel:+1" style={{
            background: 'rgba(255,255,255,0.15)',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
            border: '1px solid rgba(255,255,255,0.3)'
          }}>
            Call Evrnew
          </a>
        </div>
      </div>

      {/* Back link */}
      <Link href="/blog" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        color: '#0284c7',
        fontSize: 13,
        textDecoration: 'none',
        fontWeight: 500
      }}>
        ← Back to all posts
      </Link>
    </div>
  )
}
