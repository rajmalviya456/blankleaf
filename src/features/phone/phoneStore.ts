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
  /** An app dialog (settings, share…) opened on a phone, so Back can close it. */
  | { kind: 'app'; id: AppDialog }
  /** Any other dialog that wants Back to close it (confirm prompts…); see useBackStackEntry. */
  | { kind: 'layer'; id: string }

export type AppDialog =
  'settings' | 'about' | 'whatsNew' | 'shortcuts' | 'palette' | 'share' | 'import' | 'unpin'

export type LibrarySection = 'notes' | 'search' | 'trash'

interface PhoneState {
  stack: PhoneOverlay[]
  librarySection: LibrarySection
  previewByTab: Record<string, boolean>
  open(o: PhoneOverlay): void
  /** Close the top overlay. */
  close(): void
  /** Take `o` off the stack wherever it sits (the top one closes like close()). */
  remove(o: PhoneOverlay): void
  closeAll(): void
  setLibrarySection(s: LibrarySection): void
  setPreview(noteId: string, on: boolean): void
}

export const phoneStore = createStore<PhoneState>()((set) => ({
  stack: [],
  librarySection: 'notes',
  previewByTab: {},
  // Opening what's already on top is a no-op (e.g. long-press and contextmenu both firing).
  open: (o) => set((s) => (isTop(s.stack, o) ? s : { stack: [...s.stack, o] })),
  close: () => set((s) => ({ stack: s.stack.slice(0, -1) })),
  remove: (o) =>
    set((s) =>
      s.stack.some((x) => sameOverlay(x, o))
        ? { stack: s.stack.filter((x) => !sameOverlay(x, o)) }
        : s,
    ),
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
  return sameOverlay(top, o)
}

export function sameOverlay(a: PhoneOverlay, b: PhoneOverlay): boolean {
  if (typeof a === 'string' || typeof b === 'string') return a === b
  if (a.kind !== b.kind) return false
  if ('id' in a && 'id' in b) return a.id === b.id
  return 'noteId' in a && 'noteId' in b && a.noteId === b.noteId
}
