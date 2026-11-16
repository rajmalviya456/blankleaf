import type { Note } from '../domain/types'
import type { AppState } from './store'

/** Open tabs in display order (session order is already pinned-first). */
export function orderedTabs(s: AppState): Note[] {
  return s.session.openTabIds.map((id) => s.notes[id]).filter((n): n is Note => Boolean(n))
}

export function activeNote(s: AppState): Note | null {
  const id = s.session.activeTabId
  return (id && s.notes[id]) || null
}

/** Non-trashed notes: pinned first, then most recently edited. */
export function liveNotesSorted(s: AppState): Note[] {
  return Object.values(s.notes)
    .filter((n) => n.deletedAt === null)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt)
}

/** Trashed notes, most recently trashed first. */
export function trashedNotes(s: AppState): Note[] {
  return Object.values(s.notes)
    .filter((n) => n.deletedAt !== null)
    .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0))
}
