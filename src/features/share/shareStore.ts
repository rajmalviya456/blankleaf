import { createStore } from 'zustand'
import type { ShareHost } from './host'

interface ShareUiState {
  /** Note whose share dialog is open, if any. */
  dialogNoteId: string | null
  open(noteId: string): void
  close(): void
}

export const shareStore = createStore<ShareUiState>()((set) => ({
  dialogNoteId: null,
  open: (noteId) => set({ dialogNoteId: noteId }),
  close: () => set({ dialogNoteId: null }),
}))

let host: ShareHost | null = null

/** The running share host (null when browser storage is unavailable). Set once at startup. */
export function setShareHost(h: ShareHost | null): void {
  host = h
}

export function getShareHost(): ShareHost | null {
  return host
}
