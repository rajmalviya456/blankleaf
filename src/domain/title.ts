import type { Note } from './types'

export const TITLE_MAX = 40
export const UNTITLED = 'Untitled'

/**
 * Name shown for a note: explicit title, else first non-empty line (without a Markdown heading's
 * `#` marks), else "Untitled".
 */
export function displayTitle(note: Pick<Note, 'title' | 'content'>): string {
  const explicit = note.title?.trim()
  if (explicit) return explicit
  for (const line of note.content.split('\n', 50)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const text = trimmed.replace(/^#{1,6}\s+/, '') || trimmed
    const cut = text.slice(0, TITLE_MAX)
    // Don't leave half an emoji (a lone surrogate) at the end.
    return /[\uD800-\uDBFF]$/.test(cut) ? cut.slice(0, -1) : cut
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
