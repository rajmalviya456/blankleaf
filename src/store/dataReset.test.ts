import { openDb } from '../db/db'
import { insertNote } from '../db/notesRepo'
import { DEFAULT_SETTINGS, emptySession, newNoteDraft } from '../domain/defaults'
import { clearAllData, registerStorage } from './dataReset'
import { readJournal, writeJournal } from './journal'
import type { Persistence } from './persistence'

describe('clearAllData', () => {
  it('stops persistence, deletes the database and journal, then reloads', async () => {
    const name = `reset-${Math.random()}`
    const db = openDb(name)
    await insertNote(db, newNoteDraft(1, DEFAULT_SETTINGS))
    writeJournal({ at: 1, notes: [], session: emptySession(), settings: DEFAULT_SETTINGS })
    const stop = vi.fn()
    registerStorage(db, { stop } as unknown as Persistence)
    const reload = vi.fn()

    await clearAllData(reload)

    expect(stop).toHaveBeenCalled()
    expect(readJournal()).toBeNull()
    expect(reload).toHaveBeenCalled()
    const fresh = openDb(name)
    expect(await fresh.notes.count()).toBe(0)
    fresh.close()
  })
})
