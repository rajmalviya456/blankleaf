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

export const DB_NAME = 'notepadz'
export const SCHEMA_VERSION = 1

export class NotepadzDB extends Dexie {
  notes!: Table<Note, string>
  kv!: Table<KvRow, KvKey>
  tombstones!: Table<Tombstone, string>

  constructor(name: string) {
    super(name)
    this.version(SCHEMA_VERSION).stores({
      notes: '&id, updatedAt, deletedAt, pinned',
      kv: '&key',
      tombstones: '&id',
    })
  }
}

export function openDb(name: string = DB_NAME): NotepadzDB {
  return new NotepadzDB(name)
}
