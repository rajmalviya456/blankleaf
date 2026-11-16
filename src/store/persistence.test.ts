import { openDb, type NotepadzDB } from '../db/db'
import { loadAll } from '../db/notesRepo'
import { toastStore } from '../ui/toast'
import { readJournal } from './journal'
import { startPersistence, type Persistence } from './persistence'
import { createAppStore } from './store'

let db: NotepadzDB
let p: Persistence | null = null

beforeEach(() => {
  db = openDb(`persist-${Math.random()}`)
})
afterEach(async () => {
  p?.stop()
  p = null
  vi.restoreAllMocks()
  db.close()
  await db.delete()
})

function setup(opts: Parameters<typeof startPersistence>[2] = {}) {
  const store = createAppStore()
  p = startPersistence(store, db, { contentDelay: 20, sessionDelay: 20, retryBaseMs: 20, ...opts })
  return { store, s: () => store.getState(), p: p! }
}

const stored = async (id: string) => (await loadAll(db)).notes.find((n) => n.id === id)

describe('persistence', () => {
  it('saves note edits after the debounce and records the new rev', async () => {
    const { s } = setup()
    const id = s().newNote()
    s().updateContent(id, 'hello')
    await vi.waitFor(async () =>
      expect(await stored(id)).toMatchObject({ content: 'hello', rev: 1 }),
    )
    await vi.waitFor(() => expect(s().notes[id].rev).toBe(1))
    expect(s().ui.saveStatus).toBe('saved')
  })

  it('subsequent saves keep incrementing rev without conflicts', async () => {
    const { s, p } = setup()
    const id = s().newNote()
    s().updateContent(id, 'a')
    await p.flush()
    s().updateContent(id, 'ab')
    await p.flush()
    expect(await stored(id)).toMatchObject({ content: 'ab', rev: 2 })
  })

  it('flushes pending content on pagehide', async () => {
    const { s } = setup({ contentDelay: 60_000 })
    const id = s().newNote()
    s().updateContent(id, 'last keystrokes')
    window.dispatchEvent(new Event('pagehide'))
    await vi.waitFor(async () => expect((await stored(id))?.content).toBe('last keystrokes'))
  })

  it('flushes when the document becomes hidden', async () => {
    const { s } = setup({ contentDelay: 60_000 })
    const id = s().newNote()
    s().updateContent(id, 'x')
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.waitFor(async () => expect((await stored(id))?.content).toBe('x'))
  })

  it('persists session and settings', async () => {
    const { s, p } = setup()
    const id = s().newNote()
    s().updateContent(id, 'x')
    s().updateSettings({ tabSize: 4 })
    await p.flush()
    const all = await loadAll(db)
    expect(all.session?.openTabIds).toEqual([id])
    expect(all.settings?.tabSize).toBe(4)
  })

  it('close of empty untitled note hard-deletes from db', async () => {
    const { s, p } = setup()
    const id = s().newNote()
    s().updateContent(id, 'x')
    await p.flush()
    s().updateContent(id, '')
    s().closeTab(id)
    await p.flush()
    expect(await stored(id)).toBeUndefined()
    expect((await loadAll(db)).tombstoneIds).toEqual([])
  })

  it('purging a trashed note deletes it with a tombstone', async () => {
    const { s, p } = setup()
    const id = s().newNote()
    s().updateContent(id, 'x')
    s().trashNote(id)
    await p.flush()
    expect((await stored(id))?.deletedAt).not.toBeNull()
    s().purgeNote(id)
    await p.flush()
    expect(await stored(id)).toBeUndefined()
    expect((await loadAll(db)).tombstoneIds).toEqual([id])
  })

  it('write failure sets saveStatus error and keeps text', async () => {
    toastStore.getState().clear()
    const { s, p } = setup({ retryBaseMs: 60_000 })
    vi.spyOn(db.notes, 'put').mockRejectedValue(new DOMException('full', 'QuotaExceededError'))
    const id = s().newNote()
    s().updateContent(id, 'precious')
    await p.flush()
    expect(s().ui.saveStatus).toBe('error')
    expect(s().ui.saveError).toMatch(/full|quota/i)
    expect(s().notes[id].content).toBe('precious')
    expect(toastStore.getState().toasts).toHaveLength(1)
  })

  it('successful write after failure returns status to saved', async () => {
    const { s } = setup({ retryBaseMs: 300 })
    let failing = true
    const realPut = db.notes.put.bind(db.notes)
    vi.spyOn(db.notes, 'put').mockImplementation(((...args: Parameters<typeof realPut>) =>
      failing
        ? Promise.reject(new DOMException('full', 'QuotaExceededError'))
        : realPut(...args)) as typeof realPut)
    const id = s().newNote()
    s().updateContent(id, 'retry me')
    await vi.waitFor(() => expect(s().ui.saveStatus).toBe('error'), { interval: 5 })
    failing = false
    await vi.waitFor(async () => expect((await stored(id))?.content).toBe('retry me'), {
      timeout: 2000,
    })
    await vi.waitFor(() => expect(s().ui.saveStatus).toBe('saved'))
  })

  it('reports a rev conflict to onConflict listeners', async () => {
    const { s, p } = setup()
    const id = s().newNote()
    s().updateContent(id, 'mine')
    await p.flush()
    // Another window bumps the stored rev.
    const other = (await stored(id))!
    await db.notes.put({ ...other, content: 'theirs', rev: 5 })
    const onConflict = vi.fn()
    p.onConflict(onConflict)
    s().updateContent(id, 'mine 2')
    await p.flush()
    expect(onConflict).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'mine 2' }),
      expect.objectContaining({ content: 'theirs', rev: 5 }),
    )
  })

  it('hasPendingFor reflects unsaved edits', async () => {
    const { s, p } = setup({ contentDelay: 60_000 })
    const id = s().newNote()
    s().updateContent(id, 'x')
    expect(p.hasPendingFor(id)).toBe(true)
    await p.flush()
    expect(p.hasPendingFor(id)).toBe(false)
  })
})

describe('persistence journal', () => {
  beforeEach(() => localStorage.clear())

  it('pagehide synchronously journals unsaved notes and the session', async () => {
    const { s } = setup({ contentDelay: 60_000, sessionDelay: 60_000 })
    const id = s().newNote()
    s().updateContent(id, 'not yet in idb')
    window.dispatchEvent(new Event('pagehide'))
    // Checked synchronously: nothing async may run before the page is gone.
    const j = readJournal()
    expect(j?.notes.map((n) => n.content)).toEqual(['not yet in idb'])
    expect(j?.session?.openTabIds).toEqual([id])
  })

  it('clears the journal once everything is saved', async () => {
    const { s, p } = setup()
    const id = s().newNote()
    s().updateContent(id, 'x')
    window.dispatchEvent(new Event('pagehide'))
    expect(readJournal()).not.toBeNull()
    await p.flush()
    await vi.waitFor(() => expect(readJournal()).toBeNull())
  })

  it('clears a journal written while nothing was pending', async () => {
    const { s } = setup()
    const id = s().newNote()
    s().updateContent(id, 'x')
    await vi.waitFor(() => expect(s().ui.saveStatus).toBe('saved'))
    window.dispatchEvent(new Event('pagehide'))
    await vi.waitFor(() => expect(readJournal()).toBeNull())
  })
})

describe('persistence failure bookkeeping', () => {
  beforeEach(() => toastStore.getState().clear())

  it('a note whose save failed counts as pending until it is saved', async () => {
    const { s, p } = setup({ retryBaseMs: 60_000 })
    vi.spyOn(db.notes, 'put').mockRejectedValue(new DOMException('full', 'QuotaExceededError'))
    const id = s().newNote()
    s().updateContent(id, 'unsaved')
    await p.flush()
    expect(s().ui.saveStatus).toBe('error')
    expect(p.hasPendingFor(id)).toBe(true)
  })

  it('stays "Not saved" while a note is failing even if a settings write succeeds', async () => {
    const { s, p } = setup({ retryBaseMs: 60_000 })
    vi.spyOn(db.notes, 'put').mockRejectedValue(new DOMException('full', 'QuotaExceededError'))
    const id = s().newNote()
    s().updateContent(id, 'big note')
    await p.flush()
    s().updateSettings({ tabSize: 4 })
    await p.flush()
    await new Promise((r) => setTimeout(r, 10))
    expect(s().ui.saveStatus).toBe('error')
    expect(toastStore.getState().toasts).toHaveLength(1)
  })

  it('retries a failed purge as a purge', async () => {
    const { s, p } = setup({ retryBaseMs: 20 })
    const id = s().newNote()
    s().updateContent(id, 'x')
    s().trashNote(id)
    await p.flush()
    const del = vi
      .spyOn(db.notes, 'delete')
      .mockRejectedValueOnce(new DOMException('busy', 'UnknownError'))
    s().purgeNote(id)
    await p.flush()
    expect(s().ui.saveStatus).toBe('error')
    del.mockRestore()
    await vi.waitFor(async () => expect(await stored(id)).toBeUndefined(), { timeout: 2000 })
    await vi.waitFor(() => expect(s().ui.saveStatus).toBe('saved'))
  })

  it('a conflict reports the latest text, including typing during the save', async () => {
    const { s, p } = setup()
    const id = s().newNote()
    s().updateContent(id, 'v1')
    await p.flush()
    const other = (await stored(id))!
    await db.notes.put({ ...other, content: 'theirs', rev: 9 })
    const realGet = db.notes.get.bind(db.notes)
    let typed = false
    vi.spyOn(db.notes, 'get').mockImplementation(((key: string) => {
      if (!typed) {
        typed = true
        s().updateContent(id, 'v2 plus typed during save')
      }
      return realGet(key)
    }) as typeof realGet)
    const onConflict = vi.fn()
    p.onConflict(onConflict)
    s().updateContent(id, 'v2')
    await p.flush()
    expect(onConflict).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'v2 plus typed during save' }),
      expect.objectContaining({ content: 'theirs' }),
    )
  })
})
