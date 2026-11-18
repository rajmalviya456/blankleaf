/**
 * Blankleaf opens on a blank page. Earlier notes stay saved: they're in the notes list, and the
 * tabs that were open can be brought back with "Reopen closed tab". Reloading or going back
 * keeps the note you were working on, because that isn't starting something new.
 */
import type { StoreApi } from 'zustand'
import type { AppStore } from './store'

type NavigationType = PerformanceNavigationTiming['type'] | undefined

function currentNavigation(): NavigationType {
  const [entry] = performance.getEntriesByType?.('navigation') ?? []
  return (entry as PerformanceNavigationTiming | undefined)?.type
}

export function isFreshVisit(type: NavigationType = currentNavigation()): boolean {
  return type !== 'reload' && type !== 'back_forward'
}

export function startOnBlankLeaf(store: StoreApi<AppStore>): void {
  const s = () => store.getState()
  const previous = s().session.activeTabId
  const isEmpty = (id: string | null) => {
    const note = id ? s().notes[id] : undefined
    return !!note && note.title === null && !note.content.trim() && !note.locked && !note.pinned
  }
  const blank = isEmpty(previous) ? previous! : s().newNote()
  s().setActive(blank)
  // The tab used last closes last, so "Reopen closed tab" brings it back first.
  const others = s().session.openTabIds.filter((id) => id !== blank && id !== previous)
  for (const id of others) s().closeTab(id)
  if (previous && previous !== blank) s().closeTab(previous)
  s().setSplitNote(null)
}
