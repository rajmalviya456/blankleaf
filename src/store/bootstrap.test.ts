import { openDb, type BlankleafDB } from '../db/db'
import { insertNote, loadAll, putKv } from '../db/notesRepo'
import { DEFAULT_SETTINGS, emptySession, newNoteDraft } from '../domain/defaults'
import type { Note } from '../domain/types'
import { bootstrap, loadInitialState, requestPersistentStorage } from './bootstrap'
import { JOURNAL_PREFIX, readAllJournals, readJournal, writeJournal } from './journal'

const DAY = 86_400_000
const NOW = 100 * DAY
let db: BlankleafDB

beforeEach(() => {
  db = openDb(`boot-${Math.random()}`)
})
afterEach(async () => {
  db.close()
  await db.delete()
})

const note = (patch: Partial<Note> = {}): Note => ({
  ...newNoteDraft(NOW - DAY, DEFAULT_SETTINGS),
  content: 'x',
  rev: 1,
  ...patch,
})

describe('loadInitialState', () => {
  it('first run creates Welcome note and marks welcomeShown', async () => {
    const { state } = await loadInitialState(db, NOW)
    const [welcome] = Object.values(state.notes!)
    expect(welcome.title).toBe('Welcome')
    expect(welcome.content).toMatch(/Welcome to Blankleaf/)
    expect(state.session!.openTabIds).toEqual([welcome.id])
    expect(state.session!.activeTabId).toBe(welcome.id)
    const all = await loadAll(db)
    expect(all.meta?.welcomeShown).toBe(true)
    expect(all.notes.map((n) => n.id)).toEqual([welcome.id])
    expect(welcome.rev).toBe(1)
  })

  it('later runs with no tabs open an empty note instead of Welcome', async () => {
    await putKv(db, 'meta', { schemaVersion: 1, lastBackupAt: null, welcomeShown: true })
    const { state } = await loadInitialState(db, NOW)
    const notes = Object.values(state.notes!)
    expect(notes).toHaveLength(1)
    expect(notes[0]).toMatchObject({ title: null, content: '', rev: 0 })
    expect(state.session!.openTabIds).toEqual([notes[0].id])
  })

  it('restores openTabIds, activeTabId and perTab', async () => {
    const a = note()
    const b = note()
    await insertNote(db, a)
    await insertNote(db, b)
    const perTab = { [b.id]: { anchor: 1, head: 2, scrollTop: 30, previewMode: 'edit' as const } }
    await putKv(db, 'session', {
      ...emptySession(),
      openTabIds: [a.id, b.id],
      activeTabId: b.id,
      perTab,
    })
    const { state } = await loadInitialState(db, NOW)
    expect(state.session).toMatchObject({ openTabIds: [a.id, b.id], activeTabId: b.id, perTab })
  })

  it('drops missing/trashed ids from session', async () => {
    const a = note()
    const closed = note()
    const trashed = note({ deletedAt: NOW - DAY })
    await insertNote(db, a)
    await insertNote(db, closed)
    await insertNote(db, trashed)
    await putKv(db, 'session', {
      ...emptySession(),
      openTabIds: ['ghost', trashed.id, a.id],
      activeTabId: 'ghost',
      closedStack: ['ghost', trashed.id, closed.id],
      perTab: { ghost: { anchor: 0, head: 0, scrollTop: 0, previewMode: 'edit' } },
    })
    const { state } = await loadInitialState(db, NOW)
    expect(state.session).toMatchObject({
      openTabIds: [a.id],
      activeTabId: a.id,
      closedStack: [closed.id],
      perTab: {},
    })
  })

  it('adds pinned notes to open tabs, pinned first', async () => {
    const a = note()
    const p = note({ pinned: true })
    await insertNote(db, a)
    await insertNote(db, p)
    await putKv(db, 'session', { ...emptySession(), openTabIds: [a.id], activeTabId: a.id })
    const { state } = await loadInitialState(db, NOW)
    expect(state.session!.openTabIds).toEqual([p.id, a.id])
    expect(state.session!.activeTabId).toBe(a.id)
  })

  it('purges trash older than 30 days', async () => {
    const old = note({ deletedAt: NOW - 31 * DAY })
    await insertNote(db, old)
    const { state, tombstoneIds } = await loadInitialState(db, NOW)
    expect(state.notes![old.id]).toBeUndefined()
    expect(tombstoneIds).toContain(old.id)
  })

  it('merges stored settings over defaults', async () => {
    await putKv(db, 'settings', { tabSize: 4 })
    const { state } = await loadInitialState(db, NOW)
    expect(state.settings).toEqual({ ...DEFAULT_SETTINGS, tabSize: 4 })
  })
})

describe('bootstrap', () => {
  it('returns usable in-memory state when IndexedDB throws', async () => {
    const result = await bootstrap(NOW, () => {
      throw new Error('IndexedDB is not available')
    })
    expect(result.db).toBeNull()
    expect(result.error).toMatch(/storage unavailable/i)
    expect(Object.values(result.state.notes!)).toHaveLength(1)
    expect(result.state.session!.openTabIds).toHaveLength(1)
  })

  it('opens the database and loads state on success', async () => {
    const result = await bootstrap(NOW, () => db)
    expect(result.db).toBe(db)
    expect(result.error).toBeUndefined()
  })
})

describe('requestPersistentStorage', () => {
  it('reports unsupported when the API is missing', async () => {
    expect(await requestPersistentStorage({} as Navigator)).toBe('unsupported')
  })

  it('returns the browser decision', async () => {
    const nav = { storage: { persist: async () => true, persisted: async () => false } }
    expect(await requestPersistentStorage(nav as unknown as Navigator)).toBe(true)
  })
})

describe('journal replay', () => {
  beforeEach(() => localStorage.clear())

  it('applies newer journaled notes and session, then clears the journal', async () => {
    const stale = note({ content: 'old', updatedAt: NOW - 2 * DAY })
    await insertNote(db, stale)
    const fresh = { ...newNoteDraft(NOW - 10, DEFAULT_SETTINGS), content: 'brand new' }
    writeJournal({
      at: NOW - 5,
      notes: [{ ...stale, content: 'edited', updatedAt: NOW - 20 }, fresh],
      session: { ...emptySession(), openTabIds: [stale.id, fresh.id], activeTabId: fresh.id },
      settings: { ...DEFAULT_SETTINGS, tabSize: 8 },
    })
    const { state } = await loadInitialState(db, NOW)
    expect(state.notes![stale.id].content).toBe('edited')
    expect(state.notes![fresh.id].content).toBe('brand new')
    expect(state.session!.openTabIds).toEqual([stale.id, fresh.id])
    expect(state.session!.activeTabId).toBe(fresh.id)
    expect(state.settings!.tabSize).toBe(8)
    const stored = await loadAll(db)
    expect(stored.notes.find((n) => n.id === stale.id)).toMatchObject({ content: 'edited', rev: 2 })
    expect(readJournal()).toBeNull()
  })

  it('does not overwrite a newer stored note with an older journal copy', async () => {
    const current = note({ content: 'newest', updatedAt: NOW - 10 })
    await insertNote(db, current)
    writeJournal({
      at: NOW - 100,
      notes: [{ ...current, content: 'older', updatedAt: NOW - 100 }],
      session: emptySession(),
      settings: DEFAULT_SETTINGS,
    })
    const { state } = await loadInitialState(db, NOW)
    expect(state.notes![current.id].content).toBe('newest')
  })

  it('replays every window’s journal and skips notes deleted forever', async () => {
    const a = { ...newNoteDraft(NOW - 50, DEFAULT_SETTINGS), content: 'from window A' }
    const b = { ...newNoteDraft(NOW - 40, DEFAULT_SETTINGS), content: 'from window B' }
    const gone = { ...newNoteDraft(NOW - 30, DEFAULT_SETTINGS), content: 'purged elsewhere' }
    await db.tombstones.put({ id: gone.id, purgedAt: NOW - 1 })
    writeJournal({ at: NOW - 20, notes: [a], settings: DEFAULT_SETTINGS }, `${JOURNAL_PREFIX}A`)
    writeJournal(
      { at: NOW - 10, notes: [b, gone], settings: DEFAULT_SETTINGS },
      `${JOURNAL_PREFIX}B`,
    )
    const { state } = await loadInitialState(db, NOW)
    expect(state.notes![a.id].content).toBe('from window A')
    expect(state.notes![b.id].content).toBe('from window B')
    expect(state.notes![gone.id]).toBeUndefined()
    expect(readAllJournals()).toEqual([])
  })
})

describe('startup resilience', () => {
  beforeEach(() => localStorage.clear())

  it('a failing trash purge does not hide notes', async () => {
    const a = note({ content: 'still here' })
    await insertNote(db, a)
    await putKv(db, 'session', { ...emptySession(), openTabIds: [a.id], activeTabId: a.id })
    vi.spyOn(db.notes, 'where').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    const result = await bootstrap(NOW, () => db)
    expect(result.db).toBe(db)
    expect(result.state.notes[a.id].content).toBe('still here')
    vi.restoreAllMocks()
  })

  it('restores journaled notes when IndexedDB is unavailable', async () => {
    const j = { ...newNoteDraft(NOW - 5, DEFAULT_SETTINGS), content: 'typed in memory mode' }
    writeJournal({
      at: NOW - 1,
      notes: [j],
      session: { ...emptySession(), openTabIds: [j.id], activeTabId: j.id },
      settings: { ...DEFAULT_SETTINGS, tabSize: 4 },
    })
    const result = await bootstrap(NOW, () => {
      throw new Error('IndexedDB is not available')
    })
    expect(result.db).toBeNull()
    expect(result.state.notes[j.id].content).toBe('typed in memory mode')
    expect(result.state.session.openTabIds).toEqual([j.id])
    expect(result.state.settings.tabSize).toBe(4)
  })
})
