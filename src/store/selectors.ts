import { displayTitle } from '../domain/title'
import type { Note, NotesSort } from '../domain/types'
import type { AppState } from './store'

/** Open tabs in display order (session order is already pinned-first). */
export function orderedTabs(s: AppState): Note[] {
  return s.session.openTabIds.map((id) => s.notes[id]).filter((n): n is Note => Boolean(n))
}

export function activeNote(s: AppState): Note | null {
  const id = s.session.activeTabId
  return (id && s.notes[id]) || null
}

/** The note being edited: the side note while it has the cursor, else the active tab's. */
export function editingNote(s: AppState): Note | null {
  const side = s.ui.sideFocused ? s.session.splitNoteId : null
  return (side && s.notes[side]) || activeNote(s)
}

const byName = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

const ORDER: Record<NotesSort, (a: Note, b: Note) => number> = {
  edited: (a, b) => b.updatedAt - a.updatedAt,
  created: (a, b) => b.createdAt - a.createdAt,
  title: (a, b) => byName.compare(displayTitle(a), displayTitle(b)),
}

/** Non-trashed notes: pinned first, then in the order chosen for the notes list. */
export function liveNotesSorted(s: AppState): Note[] {
  const order = ORDER[s.settings.notesSort] ?? ORDER.edited
  return Object.values(s.notes)
    .filter((n) => n.deletedAt === null)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || order(a, b))
}

/** Trashed notes, most recently trashed first. */
export function trashedNotes(s: AppState): Note[] {
  return Object.values(s.notes)
    .filter((n) => n.deletedAt !== null)
    .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0))
}
