import { TRASH_RETENTION_DAYS } from '../domain/defaults'
import type { Note } from '../domain/types'
import type { KvKey, KvMap, Meta, BlankleafDB } from './db'

const DAY_MS = 86_400_000

export type SaveResult = { ok: true; rev: number } | { ok: false; current: Note }

/**
 * Compare-and-set save. Succeeds only if the stored rev equals `expectedRev`
 * (0 = "must not exist yet"). On success the stored rev becomes expectedRev + 1.
 * On conflict nothing is written and the stored note is returned.
 */
export function saveNote(db: BlankleafDB, note: Note, expectedRev: number): Promise<SaveResult> {
  return db.transaction('rw', db.notes, async (): Promise<SaveResult> => {
    const current = await db.notes.get(note.id)
    const storedRev = current?.rev ?? 0
    if (current && storedRev !== expectedRev) return { ok: false, current }
    // A missing row with expectedRev > 0 was deleted elsewhere: re-insert so no text is lost.
    const rev = (current ? storedRev : 0) + 1
    await db.notes.put({ ...note, rev })
    return { ok: true, rev }
  })
}

export async function insertNote(db: BlankleafDB, note: Note): Promise<void> {
  await db.notes.put(note)
}

/** Remove a note that was never trashed (e.g. empty untitled tab). No tombstone. */
export async function hardDeleteNote(db: BlankleafDB, id: string): Promise<void> {
  await db.notes.delete(id)
}

/** Permanently delete a trashed note and remember it so imports don't resurrect it. */
export function purgeNote(db: BlankleafDB, id: string, now: number): Promise<void> {
  return db.transaction('rw', db.notes, db.tombstones, async () => {
    await db.notes.delete(id)
    await db.tombstones.put({ id, purgedAt: now })
  })
}

/** Purge notes trashed more than `days` ago. Returns the purged ids. */
export function purgeExpiredTrash(
  db: BlankleafDB,
  now: number,
  days = TRASH_RETENTION_DAYS,
): Promise<string[]> {
  const cutoff = now - days * DAY_MS
  return db.transaction('rw', db.notes, db.tombstones, async () => {
    const expired = await db.notes.where('deletedAt').below(cutoff).primaryKeys()
    await db.notes.bulkDelete(expired)
    await db.tombstones.bulkPut(expired.map((id) => ({ id, purgedAt: now })))
    return expired
  })
}

export async function putKv<K extends KvKey>(
  db: BlankleafDB,
  key: K,
  value: KvMap[K],
): Promise<void> {
  await db.kv.put({ key, value })
}

export interface LoadedData {
  notes: Note[]
  session?: KvMap['session']
  settings?: KvMap['settings']
  meta?: Meta
  tombstoneIds: string[]
}

export function loadAll(db: BlankleafDB): Promise<LoadedData> {
  return db.transaction('r', db.notes, db.kv, db.tombstones, async () => {
    const [notes, kv, tombstoneIds] = await Promise.all([
      db.notes.toArray(),
      db.kv.toArray(),
      db.tombstones.toCollection().primaryKeys(),
    ])
    const get = <K extends KvKey>(k: K) =>
      kv.find((r) => r.key === k)?.value as KvMap[K] | undefined
    return {
      notes,
      session: get('session'),
      settings: get('settings'),
      meta: get('meta'),
      tombstoneIds,
    }
  })
}
