import { backlinks } from '../../domain/links'
import type { Note } from '../../domain/types'
import { getStore, useAppStore } from '../../store/store'

/** Ids of the notes linking to this one, as one string so the selector only re-renders on change. */
export function useLinkedFrom(noteId: string): Note[] {
  const ids = useAppStore((s) =>
    backlinks(s.notes, noteId)
      .map((n) => n.id)
      .join(' '),
  )
  const notes = getStore().getState().notes
  return ids ? ids.split(' ').flatMap((id) => (notes[id] ? [notes[id]] : [])) : []
}
