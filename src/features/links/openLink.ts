import { noteForLink } from '../../domain/links'
import { getStore } from '../../store/store'

/** Open the note a `[[Title]]` link points at, creating it if there's none yet. */
export function openLink(title: string): string {
  const s = getStore().getState()
  const existing = noteForLink(s.notes, title)
  if (existing) {
    s.openNote(existing.id)
    return existing.id
  }
  return s.newNote({ title, content: '' })
}

export function linkExists(title: string): boolean {
  return !!noteForLink(getStore().getState().notes, title)
}
