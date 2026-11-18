import { createStore } from 'zustand'

interface PrintState {
  /** Note being printed, if any. */
  noteId: string | null
  open(noteId: string): void
  close(): void
}

export const printStore = createStore<PrintState>()((set) => ({
  noteId: null,
  open: (noteId) => set({ noteId }),
  close: () => set({ noteId: null }),
}))
