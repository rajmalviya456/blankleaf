import { createStore } from 'zustand'

interface ReadabilityState {
  /** The note whose readability panel is open, if any. */
  noteId: string | null
  /** Mark sentences over 25 words in that note. */
  highlight: boolean
  open(noteId: string): void
  close(): void
  setHighlight(on: boolean): void
}

export const readabilityStore = createStore<ReadabilityState>()((set) => ({
  noteId: null,
  highlight: false,
  open: (noteId) => set({ noteId }),
  close: () => set({ noteId: null, highlight: false }),
  setHighlight: (highlight) => set({ highlight }),
}))
