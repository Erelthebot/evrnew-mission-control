#!/usr/bin/env node
/**
 * EVRNEW Mission Control — Live Data Prebuild Script
 * Reads local agent output files and writes lib/data/live.json
 * Runs as `prebuild` before `next build`
 */

const fs = require('fs')
const path = require('path')

const DATA_ROOT = '/Users/erel/evrnew-marketing/data'
const LOGS_ROOT = '/Users/erel/evrnew-marketing/logs'
const OUT_FILE = path.join(__dirname, '..', 'lib', 'data', 'live.json')

// ─── Helpers ────────────────────────────────────────────────────────────────

function readJSON(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8')
  } catch {
    return null
  }
}

/**
 * Read last N lines of a file. Returns [] if file missing.
 */
function lastLines(filePath, n) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    const lines = raw.split('\n').filter(l => l.trim() !== '')
    return lines.slice(-n)
  } catch {
    return []
  }
}

/**
 * Find the latest file in a directory matching a glob-like prefix/suffix pattern.
 * Sort by filename descending (ISO date names sort correctly).
 */
function latestFile(dir, matchFn) {
  try {
    const files = fs.readdirSync(dir)
      .filter(f => matchFn(f))
      .sort()
      .reverse()
    if (files.length === 0) return null
    return path.join(dir, files[0])
  } catch {
    return null
  }
}

// ─── Ads ─────────────────────────────────────────────────────────────────────

function buildAds() {
  const adsDir = path.join(DATA_ROOT, 'ads')

  let google = []
  let meta = []
  let generatedAt = null

  const googleFile = latestFile(adsDir, f => f.startsWith('google-ads-') && f.endsWith('.json'))
  if (googleFile) {
    const data = readJSON(googleFile)
    if (Array.isArray(data)) {
      google = data
    } else if (data && Array.isArray(data.ad_groups)) {
      google = data.ad_groups
    } else if (data) {
      google = [data]
    }
    const stat = fs.statSync(googleFile)
    generatedAt = stat.mtime.toISOString()
  }

  const metaFile = latestFile(adsDir, f => f.startsWith('meta-ads-') && f.endsWith('.json'))
  if (metaFile) {
    const data = readJSON(metaFile)
    if (Array.isArray(data)) {
      meta = data
    } else if (data && Array.isArray(data.ads)) {
      meta = data.ads
    } else if (data) {
      meta = [data]
    }
  }

  return { google, meta, generatedAt }
}

// ─── Social ───────────────────────────────────────────────────────────────────

function buildSocial() {
  const socialDir = path.join(DATA_ROOT, 'social')

  let facebook = []
  let instagram = []
  let google_business = []
  let generatedAt = null

  const postsFile = latestFile(socialDir, f => f.endsWith('-posts.json'))
  if (postsFile) {
    const data = readJSON(postsFile)
    if (data) {
      // Shape: { posts: { facebook: [...], instagram: [...], google_business: [...] } }
      const posts = data.posts || data
      facebook = posts.facebook || []
      instagram = posts.instagram || []
      google_business = posts.google_business || []
      generatedAt = data.generated_at || data.generatedAt || null
      if (!generatedAt) {
        const stat = fs.statSync(postsFile)
        generatedAt = stat.mtime.toISOString()
      }
    }
  }

  return { facebook, instagram, google_business, generatedAt }
}

// ─── Strategy ─────────────────────────────────────────────────────────────────

function buildStrategy() {
  const strategyDir = path.join(DATA_ROOT, 'strategy')
  const file = latestFile(strategyDir, f => f.endsWith('-weekly-brief.md') || f.endsWith('.md'))

  if (!file) return { content: '', generatedAt: null }

  const raw = readText(file)
  const content = raw ? raw.slice(0, 3000) : ''
  const stat = fs.statSync(file)
  return { content, generatedAt: stat.mtime.toISOString() }
}

// ─── Competitive ──────────────────────────────────────────────────────────────

function buildCompetitive() {
  const competitorsDir = path.join(DATA_ROOT, 'competitors')
  const file = latestFile(competitorsDir, f => f.startsWith('competitive-intel-') && f.endsWith('.md'))

  if (!file) return { content: '', generatedAt: null }

  const raw = readText(file)
  const content = raw ? raw.slice(0, 2000) : ''
  const stat = fs.statSync(file)
  return { content, generatedAt: stat.mtime.toISOString() }
}

// ─── Email Drip ───────────────────────────────────────────────────────────────

function buildEmailDrip() {
  const emailDir = path.join(DATA_ROOT, 'email-drip')
  const file = latestFile(emailDir, f => f.endsWith('-sequences.json'))

  if (!file) return { sequences: [], generatedAt: null }

  const data = readJSON(file)
  let sequences = []
  if (Array.isArray(data)) {
    sequences = data
  } else if (data && Array.isArray(data.sequences)) {
    sequences = data.sequences
  } else if (data) {
    sequences = [data]
  }

  const stat = fs.statSync(file)
  return { sequences, generatedAt: stat.mtime.toISOString() }
}

// ─── Agent Logs ───────────────────────────────────────────────────────────────

function buildAgentLogs() {
  const L = LOGS_ROOT
  return {
    ads:         lastLines(path.join(L, 'ads.log'), 15),
    social:      lastLines(path.join(L, 'social.log'), 15),
    competitive: lastLines(path.join(L, 'competitive.log'), 15),
    strategy:    lastLines(path.join(L, 'strategy.log'), 15),
    blogSeo:     lastLines(path.join(L, 'blog-seo.log'), 15),
    technicalSeo:lastLines(path.join(L, 'technical-seo.log'), 15),
    emailDrip:   lastLines(path.join(L, 'email-drip.log'), 15),
    content:     lastLines(path.join(L, 'content.log'), 15),
    inbox:       lastLines(path.join(L, 'erel-inbox.log'), 15),
    telegram:    lastLines(path.join(L, 'telegram-bot-stderr.log'), 15),
    moltbook:    lastLines(path.join(L, 'moltbook.log'), 15),
    health:      lastLines(path.join(L, 'health.log'), 5),
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  console.log('[generate-live-data] Reading agent output files...')

  const live = {
    generatedAt: new Date().toISOString(),
    ads: buildAds(),
    social: buildSocial(),
    strategy: buildStrategy(),
    competitive: buildCompetitive(),
    emailDrip: buildEmailDrip(),
    agentLogs: buildAgentLogs(),
  }

  // Ensure output directory exists
  const outDir = path.dirname(OUT_FILE)
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(live, null, 2), 'utf8')

  const adsCount = live.ads.google.length + live.ads.meta.length
  const postsCount = live.social.facebook.length + live.social.instagram.length + live.social.google_business.length
  const seqCount = live.emailDrip.sequences.length

  console.log(`[generate-live-data] Done.`)
  console.log(`  Ads: ${adsCount} (${live.ads.google.length} Google, ${live.ads.meta.length} Meta)`)
  console.log(`  Social posts: ${postsCount} (FB: ${live.social.facebook.length}, IG: ${live.social.instagram.length}, GBP: ${live.social.google_business.length})`)
  console.log(`  Email sequences: ${seqCount}`)
  console.log(`  Written to: ${OUT_FILE}`)
}

main()
