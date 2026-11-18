import { detectLanguage } from '../../domain/detectLanguage'
import { languageMeta } from '../../domain/languages'
import type { LanguageId, NoteMode } from '../../domain/types'
import { getStore } from '../../store/store'

/** "Python", or "Plain text (auto)" / "Markdown (auto)" while auto-detecting. */
export function formatLabel(lang: LanguageId, mode: NoteMode): string {
  return lang === 'auto'
    ? `${mode === 'markdown' ? 'Markdown' : 'Plain text'} (auto)`
    : languageMeta(lang).label
}

/** Set a note's format; picking auto re-detects right away so the label doesn't lag. */
export function chooseFormat(noteId: string, value: string): void {
  const s = getStore().getState()
  const next = value as LanguageId
  s.setLanguage(noteId, next)
  if (next === 'auto') {
    const guess = detectLanguage(s.notes[noteId]?.content ?? '')
    if (guess !== 'plaintext') s.setLanguage(noteId, guess)
  }
}
