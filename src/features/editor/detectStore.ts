import { createStore } from 'zustand/vanilla'
import type { LanguageId } from '../../domain/types'

interface DetectState {
  detected: { noteId: string; language: LanguageId } | null
  show(noteId: string, language: LanguageId): void
  clear(): void
}

/** The format auto-detect just picked, so the chip can say so. */
export const detectStore = createStore<DetectState>((set) => ({
  detected: null,
  show: (noteId, language) => set({ detected: { noteId, language } }),
  clear: () => set({ detected: null }),
}))
