import { openDb } from '../db/db'
import { insertNote } from '../db/notesRepo'
import { DEFAULT_SETTINGS, emptySession, newNoteDraft } from '../domain/defaults'
import { clearAllData, registerMemoryJournal, registerStorage } from './dataReset'
import { readAllJournals, readJournal, writeJournal } from './journal'
import { startMemoryJournal } from './memoryJournal'
import { createAppStore } from './store'
import type { Persistence } from './persistence'

describe('clearAllData', () => {
  it('stops persistence, deletes the database and journal, then reloads', async () => {
    const name = `reset-${Math.random()}`
    const db = openDb(name)
    await insertNote(db, newNoteDraft(1, DEFAULT_SETTINGS))
    writeJournal({ at: 1, notes: [], session: emptySession(), settings: DEFAULT_SETTINGS })
    const stop = vi.fn()
    const announce = vi.fn()
    registerStorage(db, { stop } as unknown as Persistence, announce)
    const reload = vi.fn()

    await clearAllData(reload)

    expect(announce).toHaveBeenCalled()
    expect(stop).toHaveBeenCalled()
    expect(readJournal()).toBeNull()
    expect(reload).toHaveBeenCalled()
    const fresh = openDb(name)
    expect(await fresh.notes.count()).toBe(0)
    fresh.close()
  })

  it('without IndexedDB, stops the memory journal first so the notes aren’t written back', async () => {
    localStorage.clear()
    registerStorage(null, null)
    const store = createAppStore()
    store.getState().newNote({ content: 'secret' })
    const target = new EventTarget() as unknown as Window
    registerMemoryJournal(startMemoryJournal(store, target))

    // Reloading fires beforeunload and pagehide, which save the journal while it's running.
    await clearAllData(() => {
      target.dispatchEvent(new Event('beforeunload', { cancelable: true }))
      target.dispatchEvent(new Event('pagehide'))
    })

    expect(readAllJournals()).toEqual([])
  })
})
