/**
 * Version history: earlier states of each note, so overwritten text can be brought back.
 * A version is saved with a note's first save, then at most every 5 minutes while its text
 * keeps changing; the newest 50 per note are kept. Versions live only in this browser and are
 * deleted with their note.
 */
import Dexie from 'dexie'
import type { BlankleafDB, VersionRow } from './db'

export const SNAPSHOT_EVERY_MS = 5 * 60_000
export const VERSIONS_KEPT = 50

const ofNote = (db: BlankleafDB, noteId: string) =>
  db.versions.where('[noteId+at]').between([noteId, Dexie.minKey], [noteId, Dexie.maxKey])

/** Newest first. */
export async function listVersions(db: BlankleafDB, noteId: string): Promise<VersionRow[]> {
  return (await ofNote(db, noteId).toArray()).reverse()
}

/**
 * Save `content` as a version if one is due (or always, with `force`). Call inside a
 * transaction that includes `db.versions`, or on its own.
 */
export async function saveVersion(
  db: BlankleafDB,
  noteId: string,
  content: string,
  at: number,
  { force = false } = {},
): Promise<void> {
  if (!content) return
  const last = await ofNote(db, noteId).last()
  if (last?.content === content) return
  if (!force && last && at - last.at < SNAPSHOT_EVERY_MS) return
  await db.versions.add({ noteId, at, content })
  const extra = (await ofNote(db, noteId).count()) - VERSIONS_KEPT
  if (extra > 0) await db.versions.bulkDelete(await ofNote(db, noteId).limit(extra).primaryKeys())
}

export async function deleteVersions(db: BlankleafDB, noteIds: string[]): Promise<void> {
  if (noteIds.length) await db.versions.where('noteId').anyOf(noteIds).delete()
}
