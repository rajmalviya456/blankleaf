/**
 * Keeps each note's undo history when its editor unmounts (switching tabs, or the layout
 * switching between phone and laptop when a phone rotates or a window is resized), so Undo
 * still works when the editor comes back. Only reused while the note's text is unchanged.
 *
 * The latest state is remembered on every update (a reference, no copying): the new editor
 * renders before the old one unmounts, so saving on unmount would be too late.
 */
import { historyField } from '@codemirror/commands'
import type { EditorState } from '@codemirror/state'

const LIMIT = 30 // notes
const cache = new Map<string, EditorState>()
const fields = { history: historyField }

export function rememberState(noteId: string, state: EditorState): void {
  if (cache.get(noteId) === state) return
  cache.delete(noteId)
  cache.set(noteId, state)
  while (cache.size > LIMIT) cache.delete(cache.keys().next().value!)
}

/** The saved state for `noteId` (as CodeMirror's initialState), if its text is still `content`. */
export function restoreHistory(
  noteId: string,
  content: string,
): { json: unknown; fields: typeof fields } | undefined {
  const saved = cache.get(noteId)
  if (!saved || saved.doc.toString() !== content) return undefined
  return { json: saved.toJSON(fields), fields }
}

/** Drop what's remembered for a note (its text must not linger once it's locked). */
export const forgetState = (noteId: string) => void cache.delete(noteId)
