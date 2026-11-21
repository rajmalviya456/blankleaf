import { plainLineBreaks } from '../domain/lineEndings'
import { openDb, SCHEMA_VERSION, type Meta, type BlankleafDB } from '../db/db'
import { loadAll, purgeExpiredTrash, putKv, saveNote } from '../db/notesRepo'
import {
  carryOverSpellcheck,
  emptySession,
  mergeSettings,
  newNoteDraft,
  WELCOME_CONTENT,
} from '../domain/defaults'
import type { Note, Session, Settings } from '../domain/types'
import { clearJournal, readAllJournals } from './journal'
import type { AppState } from './store'

export interface InitialState {
  state: Pick<AppState, 'notes' | 'session' | 'settings'>
  meta: Meta
  tombstoneIds: string[]
  firstRun: boolean
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
    splitNoteId: base.splitNoteId && live(base.splitNoteId) ? base.splitNoteId : null,
  }
}

/** Replay unsaved work journaled at the last page hide (see journal.ts). Newer wins. */
async function replayJournal(db: BlankleafDB): Promise<void> {
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
      console.error('Blankleaf: could not replay unsaved work; keeping it for next time', e)
    }
  }
}

export async function loadInitialState(db: BlankleafDB, now: number): Promise<InitialState> {
  await replayJournal(db)
  // Housekeeping must never stand between the user and their notes.
  await purgeExpiredTrash(db, now).catch((e) =>
    console.error('Blankleaf: could not empty old Trash items', e),
  )
  const data = await loadAll(db)
  const settings: Settings = {
    ...mergeSettings(data.settings),
    spellcheck: carryOverSpellcheck(data.settings, data.notes),
  }
  const meta: Meta = { ...DEFAULT_META, ...data.meta }
  const notes: Record<string, Note> = Object.fromEntries(
    data.notes.map((n) => [n.id, { ...n, content: plainLineBreaks(n.content) }]),
  )
  let session = sanitizeSession(data.session, notes)
  // Notes saved before the welcome flag existed: this person has been here before.
  if (!meta.welcomeShown && data.notes.length > 0) {
    meta.welcomeShown = true
    await putKv(db, 'meta', meta).catch((e) =>
      console.error('Blankleaf: could not save that the welcome was shown', e),
    )
  }
  const firstRun = !meta.welcomeShown

  if (session.openTabIds.length === 0) {
    let first = newNoteDraft(now, settings)
    if (!meta.welcomeShown) {
      first = {
        ...first,
        title: 'Welcome',
        content: WELCOME_CONTENT,
        mode: 'markdown',
        language: 'markdown',
      }
      meta.welcomeShown = true
      try {
        const res = await saveNote(db, first, 0)
        if (res.ok) first = { ...first, rev: res.rev }
        await putKv(db, 'meta', meta)
      } catch (e) {
        console.error('Blankleaf: could not save the Welcome note', e)
      }
    }
    notes[first.id] = first
    session = { ...session, openTabIds: [first.id], activeTabId: first.id }
    // The welcome note opens beside its preview, so the Markdown shows rendered straight away.
    if (first.content === WELCOME_CONTENT)
      session = {
        ...session,
        perTab: {
          ...session.perTab,
          [first.id]: { anchor: 0, head: 0, scrollTop: 0, previewMode: 'split' },
        },
      }
  }

  return { state: { notes, session, settings }, meta, tombstoneIds: data.tombstoneIds, firstRun }
}

export interface BootResult {
  state: InitialState['state']
  meta: Meta | null
  db: BlankleafDB | null
  error?: string
  /** The very first visit: the Welcome note is showing. */
  firstRun?: boolean
}

/** Open storage and load the saved session; falls back to an in-memory session if storage fails. */
export async function bootstrap(
  now: number,
  open: () => BlankleafDB = openDb,
): Promise<BootResult> {
  let db: BlankleafDB | null = null
  try {
    db = open()
    await db.open()
    const { state, meta, firstRun } = await loadInitialState(db, now)
    return { state, meta, db, firstRun }
  } catch (e) {
    db?.close()
    console.error('Blankleaf: storage unavailable', e)
    return {
      state: memoryState(now),
      meta: null,
      db: null,
      error: 'Storage unavailable — changes won’t persist',
    }
  }
}

/** In-memory start when IndexedDB can't be used: rebuild from journals if there are any. */
function memoryState(now: number): InitialState['state'] {
  const journals = readAllJournals().map((x) => x.journal)
  const notes: Record<string, Note> = {}
  let session: Session | undefined
  let settings: Settings = mergeSettings(undefined)
  for (const j of journals) {
    for (const n of j.notes)
      if (!notes[n.id] || notes[n.id].updatedAt < n.updatedAt) notes[n.id] = n
    if (j.session) session = j.session
    settings = mergeSettings(j.settings)
  }
  let sess = sanitizeSession(session, notes)
  if (!sess.openTabIds.length) {
    const note = newNoteDraft(now, settings)
    notes[note.id] = note
    sess = { ...sess, openTabIds: [note.id], activeTabId: note.id }
  }
  return { notes, session: sess, settings }
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
