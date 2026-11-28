/**
 * A note deleted for good (from Trash, by Empty Trash, or in another window) stops being shared,
 * and its stored encrypted copy goes with it.
 */
import type { StoreApi } from 'zustand'
import type { AppStore } from '../../store/store'
import type { ShareHost } from './host'

export function stopSharesOfDeletedNotes(store: StoreApi<AppStore>, host: ShareHost): () => void {
  const stopping = new Set<string>()
  const check = () => {
    const notes = store.getState().notes
    for (const row of host.active()) {
      if (notes[row.noteId] || stopping.has(row.id)) continue
      stopping.add(row.id)
      void host.stop(row.id).finally(() => stopping.delete(row.id))
    }
  }
  check()
  const offStore = store.subscribe((s, prev) => {
    if (s.notes !== prev.notes) check()
  })
  // Shares are read from storage after startup; check those too.
  const offHost = host.subscribe(check)
  return () => {
    offStore()
    offHost()
  }
}
