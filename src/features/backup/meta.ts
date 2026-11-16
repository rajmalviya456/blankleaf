import { SCHEMA_VERSION, type Meta } from '../../db/db'
import { putKv } from '../../db/notesRepo'
import { getActiveDb } from '../../store/dataReset'

let meta: Meta = { schemaVersion: SCHEMA_VERSION, lastBackupAt: null, welcomeShown: true }

/** Called at startup with the stored meta record. */
export function initMeta(m: Meta | null): void {
  if (m) meta = { ...m }
}

export function getLastBackupAt(): number | null {
  return meta.lastBackupAt
}

export async function markBackedUp(now: number): Promise<void> {
  meta = { ...meta, lastBackupAt: now }
  const db = getActiveDb()
  if (db) await putKv(db, 'meta', meta)
}
