/**
 * When IndexedDB can't be used, the app runs in memory. This keeps a localStorage journal
 * of every non-empty note (replayed on the next start) and asks before the tab closes while
 * there is text that exists only here.
 */
import type { StoreApi } from 'zustand'
import { writeJournal } from './journal'
import type { AppStore } from './store'

export function startMemoryJournal(store: StoreApi<AppStore>, target: Window = window): () => void {
  const s = () => store.getState()
  const hasText = () => Object.values(s().notes).some((n) => n.content.trim() || n.title)

  const save = () =>
    writeJournal({
      at: Date.now(),
      notes: Object.values(s().notes).filter((n) => n.content.trim() || n.title),
      session: s().session,
      settings: s().settings,
    })

  const onHide = () => void save()
  const onVisibility = () => {
    if (target.document?.visibilityState === 'hidden') save()
  }
  const onBeforeUnload = (e: Event) => {
    save()
    if (!hasText()) return
    // Browsers show their own generic "Leave site?" text.
    e.preventDefault()
    ;(e as BeforeUnloadEvent).returnValue = ''
  }

  target.addEventListener('pagehide', onHide)
  target.addEventListener('beforeunload', onBeforeUnload)
  target.document?.addEventListener('visibilitychange', onVisibility)
  return () => {
    target.removeEventListener('pagehide', onHide)
    target.removeEventListener('beforeunload', onBeforeUnload)
    target.document?.removeEventListener('visibilitychange', onVisibility)
  }
}
