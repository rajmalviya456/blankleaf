/**
 * Phone-only UI state: which overlays are open (a stack, top = last) and the phone's
 * Edit/Preview choice per tab. Deliberately not part of the saved session: overlays never
 * reopen after a reload, and the phone's view never changes the laptop's saved view.
 */
import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'

export type PhoneOverlay =
  | 'library'
  | 'tabs'
  | 'menu'
  | 'format'
  | 'shares'
  | { kind: 'tabActions' | 'noteActions'; noteId: string }

export type LibrarySection = 'notes' | 'search' | 'trash'

interface PhoneState {
  stack: PhoneOverlay[]
  librarySection: LibrarySection
  previewByTab: Record<string, boolean>
  open(o: PhoneOverlay): void
  /** Close the top overlay. */
  close(): void
  closeAll(): void
  setLibrarySection(s: LibrarySection): void
  setPreview(noteId: string, on: boolean): void
}

export const phoneStore = createStore<PhoneState>()((set) => ({
  stack: [],
  librarySection: 'notes',
  previewByTab: {},
  open: (o) => set((s) => ({ stack: [...s.stack, o] })),
  close: () => set((s) => ({ stack: s.stack.slice(0, -1) })),
  closeAll: () => set({ stack: [] }),
  setLibrarySection: (librarySection) => set({ librarySection }),
  setPreview: (noteId, on) => set((s) => ({ previewByTab: { ...s.previewByTab, [noteId]: on } })),
}))

export function usePhone<T>(selector: (s: PhoneState) => T): T {
  return useStore(phoneStore, selector)
}

/** Is `o` the overlay currently on top? (Structural match for the object overlays.) */
export function isTop(stack: PhoneOverlay[], o: PhoneOverlay): boolean {
  const top = stack.at(-1)
  if (top === undefined) return false
  if (typeof top === 'string' || typeof o === 'string') return top === o
  return top.kind === o.kind && top.noteId === o.noteId
}
