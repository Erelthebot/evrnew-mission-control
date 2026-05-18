import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

export const dynamic = 'force-dynamic'

const MEMORY_DIR = join(process.env.HOME || '/Users/erel_master', 'evrnew-marketing', 'memory')

const SECTIONS: Record<string, string> = {
  infrastructure: 'infrastructure.md',
  credentials: 'credentials.md',
  people: 'people.md',
  instructions: 'standing-instructions.md',
  lessons: 'lessons.md',
  issues: 'issues.md',
  log: 'session-log.md',
}

export async function GET(req: NextRequest) {
  const section = req.nextUrl.searchParams.get('section')

  if (section) {
    const filename = SECTIONS[section]
    if (!filename) {
      return NextResponse.json({ error: `Unknown section. Valid: ${Object.keys(SECTIONS).join(', ')}` }, { status: 400 })
    }
    const path = join(MEMORY_DIR, filename)
    if (!existsSync(path)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }
    return NextResponse.json({ section, content: readFileSync(path, 'utf8') })
  }

  // Return all sections
  const result: Record<string, string> = {}
  for (const [key, filename] of Object.entries(SECTIONS)) {
    const path = join(MEMORY_DIR, filename)
    if (existsSync(path)) {
      result[key] = readFileSync(path, 'utf8')
    }
  }
  return NextResponse.json(result)
}
