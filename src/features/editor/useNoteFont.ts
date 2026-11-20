import { effectiveEditorFont } from '../../domain/defaults'
import type { EditorFont } from '../../domain/types'
import { useAppStore } from '../../store/store'

/** The font one note is shown in (its own, or the Settings one). */
export function useNoteFont(noteId: string | null | undefined): EditorFont {
  return useAppStore((s) => effectiveEditorFont(s.settings, noteId ? s.notes[noteId] : undefined))
}
