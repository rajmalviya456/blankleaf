import { DEFAULT_SETTINGS, newNoteDraft } from '../domain/defaults'
import type { Note } from '../domain/types'
import { openDb, type BlankleafDB } from './db'
import {
  hardDeleteNote,
  insertNote,
  loadAll,
  purgeExpiredTrash,
  purgeNote,
  putKv,
  saveNote,
} from './notesRepo'

const DAY = 86_400_000
let db: BlankleafDB
let n = 0

beforeEach(() => {
  db = openDb(`test-${++n}-${Math.random()}`)
})
afterEach(async () => {
  db.close()
  await db.delete()
})

const note = (patch: Partial<Note> = {}): Note => ({
  ...newNoteDraft(1000, DEFAULT_SETTINGS),
  content: 'hi',
  ...patch,
})

describe('saveNote', () => {
  it('saveNote of a note not in db with expectedRev 0 inserts it', async () => {
    const a = note()
    const res = await saveNote(db, a, 0)
    expect(res).toEqual({ ok: true, rev: 1 })
    expect(await db.notes.get(a.id)).toMatchObject({ content: 'hi', rev: 1 })
  })

  it('saveNote with matching rev succeeds and increments rev', async () => {
    const a = note()
    await saveNote(db, a, 0)
    const res = await saveNote(db, { ...a, content: 'v2' }, 1)
    expect(res).toEqual({ ok: true, rev: 2 })
    expect(await db.notes.get(a.id)).toMatchObject({ content: 'v2', rev: 2 })
  })

  it('saveNote with stale rev returns ok:false and the current stored note, leaving db unchanged', async () => {
    const a = note()
    await saveNote(db, a, 0)
    await saveNote(db, { ...a, content: 'other window' }, 1)
    const res = await saveNote(db, { ...a, content: 'mine' }, 1)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.current).toMatchObject({ content: 'other window', rev: 2 })
    expect(await db.notes.get(a.id)).toMatchObject({ content: 'other window', rev: 2 })
  })

  it('saveNote with expectedRev 0 conflicts when the note already exists', async () => {
    const a = note()
    await saveNote(db, a, 0)
    const res = await saveNote(db, { ...a, content: 'dup' }, 0)
    expect(res.ok).toBe(false)
  })
})

describe('deletes', () => {
  it('purgeNote deletes the note and writes a tombstone', async () => {
    const a = note({ deletedAt: 5 })
    await insertNote(db, a)
    await purgeNote(db, a.id, 9000)
    expect(await db.notes.get(a.id)).toBeUndefined()
    expect(await db.tombstones.get(a.id)).toEqual({ id: a.id, purgedAt: 9000 })
  })

  it('hardDeleteNote writes no tombstone', async () => {
    const a = note()
    await insertNote(db, a)
    await hardDeleteNote(db, a.id)
    expect(await db.notes.get(a.id)).toBeUndefined()
    expect(await db.tombstones.count()).toBe(0)
  })

  it('purgeExpiredTrash removes notes with deletedAt older than 30 days only', async () => {
    const now = 100 * DAY
    const old = note({ deletedAt: now - 31 * DAY })
    const recent = note({ deletedAt: now - 29 * DAY })
    const live = note()
    await Promise.all([old, recent, live].map((x) => insertNote(db, x)))
    const purged = await purgeExpiredTrash(db, now)
    expect(purged).toEqual([old.id])
    expect(await db.notes.count()).toBe(2)
    expect(await db.tombstones.get(old.id)).toBeDefined()
  })
})

describe('loadAll', () => {
  it('returns notes and kv records', async () => {
    const a = note()
    await insertNote(db, a)
    await putKv(db, 'settings', { tabSize: 4 })
    await putKv(db, 'meta', { schemaVersion: 1, lastBackupAt: null, welcomeShown: true })
    const all = await loadAll(db)
    expect(all.notes).toHaveLength(1)
    expect(all.settings).toEqual({ tabSize: 4 })
    expect(all.meta?.welcomeShown).toBe(true)
    expect(all.session).toBeUndefined()
    expect(all.tombstoneIds).toEqual([])
  })
})

describe('schema upgrade', () => {
  it('v1 database upgrades to v2 without touching notes', async () => {
    const name = `upgrade-${Math.random()}`
    const { default: Dexie } = await import('dexie')
    const v1 = new Dexie(name)
    v1.version(1).stores({
      notes: '&id, updatedAt, deletedAt, pinned',
      kv: '&key',
      tombstones: '&id',
    })
    await v1.table('notes').put(note({ content: 'from v1' }))
    v1.close()
    const v2 = openDb(name)
    const notes = await v2.notes.toArray()
    expect(notes.map((n) => n.content)).toEqual(['from v1'])
    expect(await v2.shares.count()).toBe(0)
    v2.close()
    await v2.delete()
  })
})
