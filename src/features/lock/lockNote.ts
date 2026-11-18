/** Locks a note: replaces its text with encrypted data and removes every plain copy. */
import { deleteVersions } from '../../db/versionsRepo'
import { LOCKED_TITLE } from '../../domain/locked'
import { flushStorage, getActiveDb } from '../../store/dataReset'
import { scrubJournals } from '../../store/journal'
import { getStore } from '../../store/store'
import { forgetState } from '../editor/historyCache'
import { getShareHost } from '../share/shareStore'
import { newLockKey, seal } from './lockCrypto'
import { lockStore } from './lockStore'

export { LOCKED_TITLE }
export const PASSWORD_MIN = 8

/** Returns false if the note wasn't locked, because the dialog was cancelled meanwhile. */
export async function lockNote(id: string, password: string): Promise<boolean> {
  const cancelled = () => lockStore.getState().noteId !== id
  const lock = await newLockKey(password, id)
  const current = () => getStore().getState().notes[id]
  const note = current()
  if (!note || note.locked || cancelled()) return false
  // Key derivation takes a moment: seal whatever the note says by the time it's done.
  const locked = await seal(lock, note.content)
  const latest = current()
  if (!latest || cancelled()) return false
  const final = latest.content === note.content ? locked : await seal(lock, latest.content)
  if (cancelled()) return false
  // A title derived from the first line would give that line away, so only a chosen title stays.
  getStore()
    .getState()
    .applyLock(id, final, latest.title ?? LOCKED_TITLE)
  forgetState(id)
  scrubJournals(id)
  await flushStorage()
  const db = getActiveDb()
  if (db) await deleteVersions(db, [id])
  const host = getShareHost()
  if (host)
    await Promise.all(
      host
        .active()
        .filter((s) => s.noteId === id)
        .map((s) => host.stop(s.id)),
    )
  return true
}
