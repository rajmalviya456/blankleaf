import { readJournal } from './journal'
import { startMemoryJournal } from './memoryJournal'
import { createAppStore } from './store'

describe('memory-mode journal', () => {
  beforeEach(() => localStorage.clear())

  it('journals every non-empty note and the session on page hide', () => {
    const store = createAppStore()
    const target = new EventTarget() as unknown as Window
    const stop = startMemoryJournal(store, target)
    const id = store.getState().newNote()
    store.getState().updateContent(id, 'only in memory')
    store.getState().newNote() // blank: not worth journaling
    target.dispatchEvent(new Event('pagehide'))
    const j = readJournal()
    expect(j?.notes.map((n) => n.content)).toEqual(['only in memory'])
    expect(j?.session?.openTabIds).toHaveLength(2)
    stop()
  })

  it('asks before closing while there is unsaved text', () => {
    const store = createAppStore()
    const target = new EventTarget() as unknown as Window
    const stop = startMemoryJournal(store, target)
    const quiet = new Event('beforeunload', { cancelable: true })
    target.dispatchEvent(quiet)
    expect(quiet.defaultPrevented).toBe(false)
    const id = store.getState().newNote()
    store.getState().updateContent(id, 'x')
    const warn = new Event('beforeunload', { cancelable: true })
    target.dispatchEvent(warn)
    expect(warn.defaultPrevented).toBe(true)
    stop()
  })
})
