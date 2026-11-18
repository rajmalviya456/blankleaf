import { createStore } from 'zustand'

interface LockUiState {
  /** Note the "Lock with password" dialog is open for, if any. */
  noteId: string | null
  open(noteId: string): void
  close(): void
}

export const lockStore = createStore<LockUiState>()((set) => ({
  noteId: null,
  open: (noteId) => set({ noteId }),
  close: () => set({ noteId: null }),
}))
