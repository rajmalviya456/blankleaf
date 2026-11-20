/**
 * The backup password. Only its key is kept (in this browser's database, as a key the page can
 * use but never read out), so automatic backups stay encrypted without asking each time.
 */
import { createStore } from 'zustand/vanilla'
import { putKv } from '../../db/notesRepo'
import { getActiveDb } from '../../store/dataReset'
import { newBackupKey, type BackupKey } from './backupCrypto'

export const backupKeyStore = createStore<{ hasPassword: boolean }>()(() => ({
  hasPassword: false,
}))

/** Without a database (private mode in some browsers) the key lasts until the tab closes. */
let inMemory: BackupKey | null = null
type Listener = (from: BackupKey | null, to: BackupKey | null) => Promise<void> | void
const listeners = new Set<Listener>()

/** Re-encrypt what was saved with the old key (the backup folder listens). */
export function onBackupKeyChange(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function isKey(v: unknown): v is BackupKey {
  const k = v as Partial<BackupKey> | null
  return !!k && typeof k.salt === 'string' && typeof k.iterations === 'number' && !!k.key
}

export async function getBackupKey(): Promise<BackupKey | null> {
  const db = getActiveDb()
  let key: BackupKey | null = inMemory
  if (db) {
    const stored = (await db.kv.get('backupKey').catch(() => undefined))?.value
    key = isKey(stored) ? stored : null
  }
  backupKeyStore.setState({ hasPassword: !!key })
  return key
}

async function store(key: BackupKey | null): Promise<void> {
  const from = await getBackupKey()
  const db = getActiveDb()
  inMemory = key
  if (db) {
    if (key) await putKv(db, 'backupKey', key)
    else await db.kv.delete('backupKey')
  }
  backupKeyStore.setState({ hasPassword: !!key })
  for (const fn of listeners)
    await Promise.resolve()
      .then(() => fn(from, key))
      .catch((e) => console.error('Blankleaf: after the backup password changed', e))
}

/** Set or change the backup password: new backups use it, and saved automatic ones are redone. */
export async function setBackupPassword(password: string): Promise<void> {
  await store(await newBackupKey(password))
}

/** Back to unencrypted backups. */
export const removeBackupPassword = (): Promise<void> => store(null)

/** Tests only. */
export const __forgetBackupKey = () => {
  inMemory = null
  listeners.clear()
  backupKeyStore.setState({ hasPassword: false })
}
