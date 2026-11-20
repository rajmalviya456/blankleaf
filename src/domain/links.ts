/**
 * Links between notes: `[[Title]]` points at the note with that title. Titles match ignoring
 * case, extra spaces and a leading Markdown heading mark, so `[[project plan]]` finds a note
 * that starts with "# Project Plan".
 */
import { documentTitle } from './title'
import type { Note } from './types'

export interface NoteLink {
  title: string
  /** Where `[[` starts and `]]` ends in the text. */
  from: number
  to: number
}

const LINK = /\[\[([^[\]\n]+)\]\]/g
const FENCE = /^ {0,3}(`{3,}|~{3,})/

/** Every `[[Title]]` in the text, skipping fenced code blocks. */
export function findLinks(text: string): NoteLink[] {
  const links: NoteLink[] = []
  let fence: string | null = null
  let offset = 0
  for (const line of text.split('\n')) {
    const f = FENCE.exec(line)
    if (fence) {
      if (f && f[1][0] === fence[0] && f[1].length >= fence.length) fence = null
    } else if (f) {
      fence = f[1]
    } else {
      for (const m of line.matchAll(LINK)) {
        const title = m[1].trim()
        if (title) links.push({ title, from: offset + m.index, to: offset + m.index + m[0].length })
      }
    }
    offset += line.length + 1
  }
  return links
}

/** The form titles are compared in. */
export const linkKey = (title: string) =>
  title
    .replace(/^#{1,6}\s+/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

/**
 * The keys a note answers to: its title and, for an untitled note whose first line was cut short
 * for display, that whole line too.
 */
function ownKeys(n: Pick<Note, 'title' | 'content'>): string[] {
  const shown = linkKey(documentTitle(n))
  if (n.title?.trim()) return [shown]
  const first = n.content.split('\n', 50).find((l) => l.trim())
  const whole = first ? linkKey(first) : shown
  return whole === shown ? [shown] : [shown, whole]
}

/** The note a link points at: same title, not in the trash, the latest edited if several. */
export function noteForLink(notes: Record<string, Note>, title: string): Note | undefined {
  const key = linkKey(title)
  let best: Note | undefined
  for (const n of Object.values(notes)) {
    if (n.deletedAt !== null || !ownKeys(n).includes(key)) continue
    if (!best || n.updatedAt > best.updatedAt) best = n
  }
  return best
}

/** Each note's link targets, read once per version of its text (notes are replaced, not edited). */
const keysCache = new WeakMap<Note, Set<string>>()

/** The (compared-form) titles a note links to. */
export function linkKeys(note: Note): Set<string> {
  let keys = keysCache.get(note)
  if (!keys) {
    keys = new Set(
      note.content.includes('[[') ? findLinks(note.content).map((l) => linkKey(l.title)) : [],
    )
    keysCache.set(note, keys)
  }
  return keys
}

/** Notes whose text links to this one (locked notes' text can't be read, so they don't count). */
export function backlinks(notes: Record<string, Note>, noteId: string): Note[] {
  const target = notes[noteId]
  if (!target) return []
  const keys = ownKeys(target)
  return Object.values(notes)
    .filter(
      (n) =>
        n.id !== noteId &&
        n.deletedAt === null &&
        !n.locked &&
        keys.some((k) => linkKeys(n).has(k)),
    )
    .sort((a, b) => b.updatedAt - a.updatedAt)
}
