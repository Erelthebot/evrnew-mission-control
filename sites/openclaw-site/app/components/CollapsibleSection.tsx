'use client'

import { useState, useEffect, useRef } from 'react'

interface Props {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

export default function CollapsibleSection({ title, defaultOpen = true, children }: Props) {
  const storageKey = `collapse:${title}`
  const [open, setOpen] = useState(defaultOpen)
  const [height, setHeight] = useState<number | 'auto'>('auto')
  const [animating, setAnimating] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const initialized = useRef(false)

  // Load saved state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved !== null) setOpen(saved === 'true')
    initialized.current = true
  }, [storageKey])

  // Sync height for animation after first render
  useEffect(() => {
    if (!initialized.current) return
    if (!contentRef.current) return
    if (open) {
      const full = contentRef.current.scrollHeight
      setHeight(full)
      setAnimating(true)
      const t = setTimeout(() => { setHeight('auto'); setAnimating(false) }, 300)
      return () => clearTimeout(t)
    } else {
      const full = contentRef.current.scrollHeight
      setHeight(full)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setHeight(0)
          setAnimating(true)
          const t = setTimeout(() => setAnimating(false), 300)
          return () => clearTimeout(t)
        })
      })
    }
  }, [open])

  const toggle = () => {
    const next = !open
    setOpen(next)
    localStorage.setItem(storageKey, String(next))
  }

  return (
    <section>
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between group mb-0 pb-2 border-b border-slate-200 focus:outline-none"
        aria-expanded={open}
      >
        <h2 className="text-[10px] tracking-[3px] uppercase text-sky-600 group-hover:text-sky-700 transition-colors">
          {title}
        </h2>
        <span
          className={`text-slate-400 group-hover:text-slate-600 transition-all duration-200 text-xs ${open ? 'rotate-0' : '-rotate-90'}`}
          style={{ display: 'inline-block' }}
        >
          ▾
        </span>
      </button>

      <div
        ref={contentRef}
        style={{
          height: height === 'auto' ? 'auto' : `${height}px`,
          overflow: height === 'auto' && !animating ? 'visible' : 'hidden',
          transition: 'height 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div className="pt-3">
          {children}
        </div>
      </div>
    </section>
  )
}
