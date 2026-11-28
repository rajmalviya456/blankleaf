import type { Note } from './types'

export const TITLE_MAX = 40
export const UNTITLED = 'Untitled'
const MARKER_LINE = /^(?:(?:`{3,}|~{3,})[\w+-]*|-{3,})$/

/**
 * Name shown for a note: explicit title, else first non-empty line (without a Markdown heading's
 * `#` marks), else "Untitled".
 */
export function displayTitle(note: Pick<Note, 'title' | 'content'>): string {
  const explicit = note.title?.trim()
  if (explicit) return explicit
  let markerOnly = ''
  for (const line of note.content.split('\n', 50)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    // A code fence (```js) or front-matter rule (---) says nothing about the note.
    if (MARKER_LINE.test(trimmed)) {
      markerOnly ||= trimmed
      continue
    }
    const text = trimmed.replace(/^#{1,6}\s+/, '') || trimmed
    const cut = text.slice(0, TITLE_MAX)
    // Don't leave half an emoji (a lone surrogate) at the end.
    return /[\uD800-\uDBFF]$/.test(cut) ? cut.slice(0, -1) : cut
  }
  return markerOnly ? markerOnly.slice(0, TITLE_MAX) : UNTITLED
}

/** The title for a file or printed page: without the first line's Markdown heading marks. */
export function documentTitle(note: Pick<Note, 'title' | 'content'>): string {
  return (
    displayTitle(note)
      .replace(/^#{1,6}\s+/, '')
      .trim() || displayTitle(note)
  )
}
