import type { Note } from './types'

export const TITLE_MAX = 40
export const UNTITLED = 'Untitled'

/** Name shown for a note: explicit title, else first non-empty line, else "Untitled". */
export function displayTitle(note: Pick<Note, 'title' | 'content'>): string {
  const explicit = note.title?.trim()
  if (explicit) return explicit
  for (const line of note.content.split('\n', 50)) {
    const trimmed = line.trim()
    if (trimmed) return trimmed.slice(0, TITLE_MAX)
  }
  return UNTITLED
}

/** The title for a file or printed page: without the first line's Markdown heading marks. */
export function documentTitle(note: Pick<Note, 'title' | 'content'>): string {
  return (
    displayTitle(note)
      .replace(/^#{1,6}\s+/, '')
      .trim() || displayTitle(note)
  )
}
