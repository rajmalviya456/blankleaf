/** Locks a note: replaces its text with encrypted data and removes every plain copy. */
import { deleteVersions } from '../../db/versionsRepo'
import { flushStorage, getActiveDb } from '../../store/dataReset'
import { getStore } from '../../store/store'
import { forgetState } from '../editor/historyCache'
import { getShareHost } from '../share/shareStore'
import { newLockKey, seal } from './lockCrypto'

export const LOCKED_TITLE = 'Locked note'
export const PASSWORD_MIN = 8

export async function lockNote(id: string, password: string): Promise<void> {
  const lock = await newLockKey(password)
  const current = () => getStore().getState().notes[id]
  const note = current()
  if (!note || note.locked) return
  // Key derivation takes a moment: seal whatever the note says by the time it's done.
  const locked = await seal(lock, id, note.content)
  const latest = current()
  if (!latest) return
  const final = latest.content === note.content ? locked : await seal(lock, id, latest.content)
  // A title derived from the first line would give that line away, so only a chosen title stays.
  getStore()
    .getState()
    .applyLock(id, final, latest.title ?? LOCKED_TITLE)
  forgetState(id)
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
}
