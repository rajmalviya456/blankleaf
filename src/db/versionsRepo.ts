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
 *
 * `replaced` is the text this save overwrites. When a version is due it is kept first, so the
 * last words written before a pause are never lost between the 5-minute versions.
 */
export async function saveVersion(
  db: BlankleafDB,
  noteId: string,
  content: string,
  at: number,
  { force = false, replaced }: { force?: boolean; replaced?: { content: string; at: number } } = {},
): Promise<void> {
  if (!content) return
  const last = await ofNote(db, noteId).last()
  if (last?.content === content) return
  if (!force && last && at - last.at < SNAPSHOT_EVERY_MS) return
  if (
    last &&
    replaced?.content &&
    replaced.content !== last.content &&
    replaced.content !== content &&
    replaced.at > last.at &&
    replaced.at < at
  )
    await db.versions.add({ noteId, at: replaced.at, content: replaced.content })
  await db.versions.add({ noteId, at, content })
  const extra = (await ofNote(db, noteId).count()) - VERSIONS_KEPT
  if (extra > 0) await db.versions.bulkDelete(await ofNote(db, noteId).limit(extra).primaryKeys())
}

export async function deleteVersions(db: BlankleafDB, noteIds: string[]): Promise<void> {
  if (noteIds.length) await db.versions.where('noteId').anyOf(noteIds).delete()
}

/** Add versions from a backup, skipping ones already here and keeping the newest per note. */
export function importVersions(
  db: BlankleafDB,
  rows: { noteId: string; at: number; content: string }[],
): Promise<void> {
  return db.transaction('rw', db.versions, async () => {
    for (const noteId of new Set(rows.map((r) => r.noteId))) {
      const here = await ofNote(db, noteId).toArray()
      const seen = new Set(here.map((v) => `${v.at}:${v.content}`))
      const fresh = rows.filter((r) => r.noteId === noteId && !seen.has(`${r.at}:${r.content}`))
      await db.versions.bulkAdd(fresh.map(({ noteId, at, content }) => ({ noteId, at, content })))
      const extra = (await ofNote(db, noteId).count()) - VERSIONS_KEPT
      if (extra > 0)
        await db.versions.bulkDelete(await ofNote(db, noteId).limit(extra).primaryKeys())
    }
  })
}
