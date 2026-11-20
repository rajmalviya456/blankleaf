import { effectiveEditorFontSize } from '../../domain/defaults'
import { useIsPhone } from '../../lib/media'
import { useAppStore } from '../../store/store'

/** The text size one note is shown at on this device (its own size, or the Settings one). */
export function useNoteFontSize(noteId: string | null | undefined): number {
  const phone = useIsPhone()
  return useAppStore((s) =>
    effectiveEditorFontSize(s.settings, phone, noteId ? s.notes[noteId] : undefined),
  )
}
