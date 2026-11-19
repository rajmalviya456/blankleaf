import { createStore } from 'zustand'

export interface CompareSide {
  label: string
  text: string
}

interface CompareState {
  /** The note on the right (its current text); null when closed. */
  noteId: string | null
  /** What it's compared with; null while picking another note. */
  other: CompareSide | null
  open(noteId: string, other?: CompareSide): void
  pick(other: CompareSide): void
  close(): void
}

export const compareStore = createStore<CompareState>()((set) => ({
  noteId: null,
  other: null,
  open: (noteId, other) => set({ noteId, other: other ?? null }),
  pick: (other) => set({ other }),
  close: () => set({ noteId: null, other: null }),
}))
