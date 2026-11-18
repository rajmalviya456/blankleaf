import { displayTitle } from '../../domain/title'
import type { Note } from '../../domain/types'

export interface SearchResult {
  id: string
  title: string
  snippet: string
  /** [from, to) offsets inside `snippet`. */
  matchRanges: [number, number][]
  /** Offset of the first content match in the note (-1 if only the title matched). */
  firstMatch: number
  count: number
  score: number
}

const SNIPPET = 120
const MAX_COUNT = 999

function countMatches(hay: string, needle: string): number {
  let count = 0
  for (let i = hay.indexOf(needle); i !== -1 && count < MAX_COUNT; i = hay.indexOf(needle, i + 1))
    count++
  return count
}

/** Case-insensitive search over titles, tags and content of non-trashed notes. */
export function searchNotes(notes: Note[], query: string, limit = 50): SearchResult[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const results: SearchResult[] = []

  for (const note of notes) {
    if (note.deletedAt !== null) continue
    const title = displayTitle(note)
    const titleHit = title.toLowerCase().includes(q)
    const lower = note.content.toLowerCase()
    const first = lower.indexOf(q)
    const tag = q.replace(/^#+/, '')
    const tagHit = !!tag && (note.tags ?? []).some((t) => t.toLowerCase().includes(tag))
    if (!titleHit && !tagHit && first === -1) continue

    let snippet = first === -1 && tagHit ? note.tags!.map((t) => `#${t}`).join(' ') : ''
    const matchRanges: [number, number][] = []
    if (first !== -1) {
      const start = Math.max(0, first - Math.floor((SNIPPET - q.length) / 2))
      const end = Math.min(note.content.length, start + SNIPPET)
      const raw = note.content.slice(start, end).replace(/\s/g, ' ')
      const prefix = start > 0 ? '…' : ''
      snippet = prefix + raw + (end < note.content.length ? '…' : '')
      const lowerSnippet = snippet.toLowerCase()
      for (let i = lowerSnippet.indexOf(q); i !== -1; i = lowerSnippet.indexOf(q, i + q.length))
        matchRanges.push([i, i + q.length])
    }
    const count = first === -1 ? 0 : countMatches(lower, q)
    const score =
      (titleHit ? 1000 : 0) +
      (tagHit ? 500 : 0) +
      Math.min(count, 50) +
      (note.pinned ? 5 : 0) +
      note.updatedAt / 1e13
    results.push({ id: note.id, title, snippet, matchRanges, firstMatch: first, count, score })
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit)
}
