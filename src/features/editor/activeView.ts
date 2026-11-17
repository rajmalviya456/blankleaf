/** The mounted editor for the active note, so the toolbar can act on it. */
import type { EditorView } from '@codemirror/view'
import { useSyncExternalStore } from 'react'

let current: EditorView | null = null
const listeners = new Set<() => void>()

export function setActiveView(view: EditorView | null): void {
  current = view
  listeners.forEach((cb) => cb())
}

/** Clear only if `view` is still the registered one (a newer editor may have replaced it). */
export function releaseActiveView(view: EditorView): void {
  if (current === view) setActiveView(null)
}

export const getActiveView = (): EditorView | null => current

export function useActiveView(): EditorView | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => current,
  )
}
