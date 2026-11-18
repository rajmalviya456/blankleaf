import { createStore } from 'zustand'

interface GoalUiState {
  /** Note whose word goal is being set, if any. */
  noteId: string | null
  open(noteId: string): void
  close(): void
}

export const goalStore = createStore<GoalUiState>()((set) => ({
  noteId: null,
  open: (noteId) => set({ noteId }),
  close: () => set({ noteId: null }),
}))
