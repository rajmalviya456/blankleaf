import { createStore } from 'zustand'

interface HistoryUiState {
  /** Note whose version history is open, if any. */
  noteId: string | null
  open(noteId: string): void
  close(): void
}

export const historyStore = createStore<HistoryUiState>()((set) => ({
  noteId: null,
  open: (noteId) => set({ noteId }),
  close: () => set({ noteId: null }),
}))
