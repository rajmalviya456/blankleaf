/** The mounted editor for the active note, so the toolbar can act on it and read its state. */
import type { EditorView } from '@codemirror/view'
import { useCallback, useSyncExternalStore } from 'react'

let current: EditorView | null = null
/** The main editor: it takes over again when the side note's editor goes away. */
let main: EditorView | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((cb) => cb())

export function setActiveView(view: EditorView | null): void {
  current = view
  notify()
}

/** Register the main editor, which the toolbar follows unless the side note has focus. */
export function setMainView(view: EditorView): void {
  main = view
  setActiveView(view)
}

/** Clear only if `view` is still the registered one (a newer editor may have replaced it). */
export function releaseActiveView(view: EditorView): void {
  if (main === view) main = null
  if (current === view) setActiveView(main)
}

/** Call after the active editor's state changes so derived values (undo depth…) refresh. */
export function activeViewUpdated(view: EditorView): void {
  if (view === current) notify()
}

export const getActiveView = (): EditorView | null => current

const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function useActiveView(): EditorView | null {
  return useSyncExternalStore(subscribe, () => current)
}

/**
 * A value derived from the active editor, re-read on every editor update. Return a primitive
 * so React skips re-rendering when it hasn't changed.
 */
export function useActiveViewValue<T>(read: (view: EditorView | null) => T): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const snapshot = useCallback(() => read(current), [])
  return useSyncExternalStore(subscribe, snapshot)
}
