import { openDb, SCHEMA_VERSION, type Meta, type NotepadzDB } from '../db/db'
import { loadAll, purgeExpiredTrash, putKv, saveNote } from '../db/notesRepo'
import { emptySession, mergeSettings, newNoteDraft, WELCOME_CONTENT } from '../domain/defaults'
import type { Note, Session, Settings } from '../domain/types'
import { clearJournal, readAllJournals } from './journal'
import type { AppState } from './store'

export interface InitialState {
  state: Pick<AppState, 'notes' | 'session' | 'settings'>
  meta: Meta
  tombstoneIds: string[]
}

const DEFAULT_META: Meta = {
  schemaVersion: SCHEMA_VERSION,
  lastBackupAt: null,
  welcomeShown: false,
}

/** Make a stored session safe against notes that were deleted, trashed or pinned elsewhere. */
function sanitizeSession(stored: Session | undefined, notes: Record<string, Note>): Session {
  const base = { ...emptySession(), ...stored }
  const live = (id: string) => notes[id] !== undefined && notes[id].deletedAt === null
  const open = [...new Set(base.openTabIds ?? [])].filter(live)
  for (const n of Object.values(notes))
    if (n.pinned && live(n.id) && !open.includes(n.id)) open.push(n.id)
  const openTabIds = [
    ...open.filter((id) => notes[id].pinned),
    ...open.filter((id) => !notes[id].pinned),
  ]
  const activeTabId =
    base.activeTabId && openTabIds.includes(base.activeTabId)
      ? base.activeTabId
      : (openTabIds[0] ?? null)
  const perTab = Object.fromEntries(
    Object.entries(base.perTab ?? {}).filter(([id]) => openTabIds.includes(id)),
  )
  return {
    ...base,
    openTabIds,
    activeTabId,
    perTab,
    closedStack: (base.closedStack ?? []).filter((id) => live(id) && !openTabIds.includes(id)),
    sidebar: { ...emptySession().sidebar, ...base.sidebar },
  }
}

/** Replay unsaved work journaled at the last page hide (see journal.ts). Newer wins. */
async function replayJournal(db: NotepadzDB): Promise<void> {
  for (const { key, journal: j } of readAllJournals()) {
    try {
      await db.transaction('rw', db.notes, db.kv, db.tombstones, async () => {
        for (const n of j.notes) {
          if (await db.tombstones.get(n.id)) continue // deleted forever elsewhere
          const current = await db.notes.get(n.id)
          if (current && current.updatedAt >= n.updatedAt) continue
          await db.notes.put({ ...n, rev: (current?.rev ?? 0) + 1 })
        }
        if (j.session) await putKv(db, 'session', j.session)
        await putKv(db, 'settings', j.settings)
      })
      clearJournal(key) // only once its contents are safely in IndexedDB
    } catch (e) {
      console.error('Notepadz: could not replay unsaved work; keeping it for next time', e)
    }
  }
}

export async function loadInitialState(db: NotepadzDB, now: number): Promise<InitialState> {
  await replayJournal(db)
  await purgeExpiredTrash(db, now)
  const data = await loadAll(db)
  const settings: Settings = mergeSettings(data.settings)
  const meta: Meta = { ...DEFAULT_META, ...data.meta }
  const notes: Record<string, Note> = Object.fromEntries(data.notes.map((n) => [n.id, n]))
  let session = sanitizeSession(data.session, notes)

  if (session.openTabIds.length === 0) {
    let first = newNoteDraft(now, settings)
    if (!meta.welcomeShown) {
      first = { ...first, title: 'Welcome', content: WELCOME_CONTENT }
      const res = await saveNote(db, first, 0)
      if (res.ok) first = { ...first, rev: res.rev }
      meta.welcomeShown = true
      await putKv(db, 'meta', meta)
    }
    notes[first.id] = first
    session = { ...session, openTabIds: [first.id], activeTabId: first.id }
  }

  return { state: { notes, session, settings }, meta, tombstoneIds: data.tombstoneIds }
}

export interface BootResult {
  state: InitialState['state']
  meta: Meta | null
  db: NotepadzDB | null
  error?: string
}

/** Open storage and load the saved session; falls back to an in-memory session if storage fails. */
export async function bootstrap(now: number, open: () => NotepadzDB = openDb): Promise<BootResult> {
  let db: NotepadzDB | null = null
  try {
    db = open()
    await db.open()
    const { state, meta } = await loadInitialState(db, now)
    return { state, meta, db }
  } catch (e) {
    db?.close()
    console.error('Notepadz: storage unavailable', e)
    const settings = mergeSettings(undefined)
    const note = newNoteDraft(now, settings)
    return {
      state: {
        notes: { [note.id]: note },
        session: { ...emptySession(), openTabIds: [note.id], activeTabId: note.id },
        settings,
      },
      meta: null,
      db: null,
      error: 'Storage unavailable — changes won’t persist',
    }
  }
}

export async function requestPersistentStorage(
  nav: Navigator = navigator,
): Promise<boolean | 'unsupported'> {
  if (!nav.storage?.persist) return 'unsupported'
  try {
    if (await nav.storage.persisted?.()) return true
    return await nav.storage.persist()
  } catch {
    return false
  }
}
