/**
 * IndexedDB schema (via Dexie).
 *
 * Migration rule: never drop or rewrite user data destructively. A new schema is a new
 * `this.version(n).stores({...}).upgrade(tx => ...)` that transforms rows in place.
 */
import Dexie, { type Table } from 'dexie'
import type { Note, Session, Settings } from '../domain/types'

export interface Meta {
  schemaVersion: number
  lastBackupAt: number | null
  welcomeShown: boolean
}

export interface KvMap {
  session: Session
  settings: Partial<Settings>
  meta: Meta
}

export type KvKey = keyof KvMap

export interface KvRow {
  key: KvKey
  value: unknown
}

export interface Tombstone {
  id: string
  purgedAt: number
}

/** An active link share served by this browser (see features/share). */
export interface ShareRow {
  id: string
  noteId: string
  title: string
  /** Link key, base64url. Deleted with the row when the share ends. */
  keyB64: string
  /** Expiry in epoch seconds, as carried in the link. */
  exp: number
  peerId: string
  readTokenHash: string
  /** Kept on this device only so "Copy message" works after a restart. */
  password: string | null
  /** AES-GCM IV and ciphertext, base64url (strings survive every structured-clone realm). */
  iv: string
  ciphertext: string
  createdAt: number
  expiresAt: number
  opens: number
  lastOpenedAt: number | null
  failures: number
  coolDownUntil: number
  coolDownMs: number
  stopped: boolean
}

/** Kept from the app's former name (Notepadz): renaming it would orphan everyone's saved notes. */
export const DB_NAME = 'notepadz'
export const SCHEMA_VERSION = 2

export class BlankleafDB extends Dexie {
  notes!: Table<Note, string>
  kv!: Table<KvRow, KvKey>
  tombstones!: Table<Tombstone, string>
  shares!: Table<ShareRow, string>

  constructor(name: string) {
    super(name)
    this.version(1).stores({
      notes: '&id, updatedAt, deletedAt, pinned',
      kv: '&key',
      tombstones: '&id',
    })
    // v2 only adds the shares table; existing data is untouched.
    this.version(2).stores({ shares: '&id, expiresAt, noteId' })
  }
}

export function openDb(name: string = DB_NAME): BlankleafDB {
  return new BlankleafDB(name)
}
