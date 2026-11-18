import { createStore } from 'zustand'

interface TagsUiState {
  /** Note whose tags are being edited, if any. */
  noteId: string | null
  open(noteId: string): void
  close(): void
}

export const tagsStore = createStore<TagsUiState>()((set) => ({
  noteId: null,
  open: (noteId) => set({ noteId }),
  close: () => set({ noteId: null }),
}))
