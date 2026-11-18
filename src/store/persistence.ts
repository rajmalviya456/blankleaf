/**
 * Mirrors the app store into IndexedDB.
 *
 * - Note edits: debounced per note (default 300ms), saved with a rev check.
 * - Session + settings: debounced (default 1000ms).
 * - Everything pending is flushed on page hide, tab switch and tab close.
 * - A note that disappears from the store was either trashed (→ purge + tombstone) or
 *   an empty untitled tab (→ hard delete). See the contract at the top of store.ts.
 * - A note whose `rev` changed came from a save or another window, not an edit: no save.
 * - Write errors keep the text in memory, show "Not saved" and retry with backoff.
 */
import type { StoreApi } from 'zustand'
import type { BlankleafDB } from '../db/db'
import { hardDeleteNote, purgeNote, putKv, saveNote } from '../db/notesRepo'
import type { Note } from '../domain/types'
import { createDebouncedWriter } from '../lib/debouncedWriter'
import { toast } from '../ui/toast'
import { clearJournal, writeJournal } from './journal'
import type { AppState, AppStore } from './store'

type NoteOp = 'save' | 'hard-delete' | 'purge'
type ConflictListener = (local: Note, current: Note) => void

/** A write that reached IndexedDB (used to notify other windows). */
export type WriteEvent =
  { t: 'note'; id: string; rev: number } | { t: 'deleted'; id: string } | { t: 'settings' }
type WriteListener = (e: WriteEvent) => void

export interface PersistenceOptions {
  contentDelay?: number
  sessionDelay?: number
  /** First retry delay after a failed write; doubles up to 10s. */
  retryBaseMs?: number
  target?: Window
  now?: () => number
  /** Return false to skip writing the session (used by multi-window sync). */
  shouldPersistSession?: () => boolean
}

export interface Persistence {
  flush(): Promise<void>
  stop(): void
  onConflict(cb: ConflictListener): () => void
  onWrite(cb: WriteListener): () => void
  hasPendingFor(id: string): boolean
  /** Tell persistence a note now matches the DB at `rev` (e.g. applied from another window). */
  markSynced(id: string, rev: number): void
  /** Write the tab session now (e.g. this window just became the session owner). */
  saveSession(): Promise<void>
}

const MAX_RETRY_MS = 10_000

function describeError(e: unknown): string {
  if (e instanceof DOMException && e.name === 'QuotaExceededError')
    return `Storage is full (${e.message})`
  if (e instanceof Error) return e.message || e.name
  return String(e)
}

export function startPersistence(
  store: StoreApi<AppStore>,
  db: BlankleafDB,
  opts: PersistenceOptions = {},
): Persistence {
  const {
    contentDelay = 300,
    sessionDelay = 1000,
    retryBaseMs = 1000,
    target = window,
    now = Date.now,
    shouldPersistSession = () => true,
  } = opts

  const knownRev = new Map<string, number>()
  for (const n of Object.values(store.getState().notes)) knownRev.set(n.id, n.rev)

  const conflictListeners = new Set<ConflictListener>()
  const writeListeners = new Set<WriteListener>()
  const emit = (e: WriteEvent) => writeListeners.forEach((cb) => cb(e))
  // Writes that failed and are waiting for a retry, keyed per note / per meta record, with
  // the operation to retry. While any remain, the status stays "Not saved".
  const failed = new Map<
    string,
    { kind: 'note'; id: string; op: NoteOp } | { kind: 'meta'; key: string }
  >()
  let attempts = 0
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  const noteKey = (id: string) => `note:${id}`

  const s = () => store.getState()

  let journaled = false

  /** Once nothing is queued, in flight or failed, show "Saved" (deferred past the writer's bookkeeping). */
  const settle = () =>
    setTimeout(() => {
      if (failed.size || anyPending()) return
      if (journaled) {
        clearJournal()
        journaled = false
      }
      if (s().ui.saveStatus !== 'saved') s().setSaveStatus('saved')
    }, 0)

  const markOk = (key: string) => {
    failed.delete(key)
    if (!failed.size) attempts = 0
    settle()
  }

  const scheduleRetry = () => {
    clearTimeout(retryTimer)
    const delay = Math.min(retryBaseMs * 2 ** Math.max(0, attempts - 1), MAX_RETRY_MS)
    retryTimer = setTimeout(() => {
      for (const f of failed.values()) {
        if (f.kind === 'meta') meta.schedule(f.key, null)
        else if (f.op !== 'save' || s().notes[f.id]) notes.schedule(f.id, f.op)
        else failed.delete(noteKey(f.id))
      }
    }, delay)
  }

  const markFailed = (
    key: string,
    entry: { kind: 'note'; id: string; op: NoteOp } | { kind: 'meta'; key: string },
    e: unknown,
  ) => {
    const firstInEpisode = failed.size === 0
    failed.set(key, entry)
    attempts++
    s().setSaveStatus('error', describeError(e))
    if (firstInEpisode) {
      toast('Couldn’t save to browser storage. Your text is kept in this tab.', {
        tone: 'error',
        durationMs: 0,
        action: {
          label: 'Export now',
          // Lazy import keeps the store layer free of a static dependency on features.
          run: () => void import('../features/backup/actions').then((m) => m.exportAll()),
        },
      })
    }
    scheduleRetry()
  }

  const writeNote = async (id: string, op: NoteOp) => {
    try {
      if (op === 'hard-delete') {
        await hardDeleteNote(db, id)
        knownRev.delete(id)
        emit({ t: 'deleted', id })
      } else if (op === 'purge') {
        await purgeNote(db, id, now())
        knownRev.delete(id)
        emit({ t: 'deleted', id })
      } else {
        const note = s().notes[id]
        if (!note) return
        const res = await saveNote(db, note, knownRev.get(id) ?? 0)
        if (res.ok) {
          knownRev.set(id, res.rev)
          emit({ t: 'note', id, rev: res.rev })
          const latest = s().notes[id]
          if (latest && latest.rev !== res.rev) {
            store.setState({ notes: { ...s().notes, [id]: { ...latest, rev: res.rev } } })
          }
        } else {
          // Report the newest local text (the user may have typed while the save was in flight).
          const latest = s().notes[id] ?? note
          if (conflictListeners.size) conflictListeners.forEach((cb) => cb(latest, res.current))
          else {
            // No sync handler yet: keep this window's text (never drop what the user typed).
            knownRev.set(id, res.current.rev)
            notes.schedule(id, 'save')
          }
        }
      }
      markOk(noteKey(id))
    } catch (e) {
      markFailed(noteKey(id), { kind: 'note', id, op }, e)
    }
  }

  const writeMeta = async (key: string) => {
    try {
      if (key === 'session') {
        if (!shouldPersistSession()) return
        await putKv(db, 'session', s().session)
      } else {
        await putKv(db, 'settings', s().settings)
        emit({ t: 'settings' })
      }
      markOk(`meta:${key}`)
    } catch (e) {
      markFailed(`meta:${key}`, { kind: 'meta', key }, e)
    }
  }

  const notes = createDebouncedWriter<NoteOp>(writeNote, contentDelay)
  const meta = createDebouncedWriter<null>((k) => writeMeta(k), sessionDelay)
  const anyPending = () => notes.hasPending() || meta.hasPending()
  /** Unsaved local changes for this note: queued, in flight, or failed and awaiting retry. */
  const hasPendingFor = (id: string) => notes.hasPending(id) || failed.has(noteKey(id))

  const flush = async () => {
    await Promise.all([notes.flush(), meta.flush()])
  }

  const markSaving = () => {
    if (s().ui.saveStatus === 'saved') s().setSaveStatus('saving')
  }

  const onChange = (next: AppState, prev: AppState) => {
    let flushNow = false

    if (next.notes !== prev.notes) {
      for (const [id, note] of Object.entries(next.notes)) {
        const before = prev.notes[id]
        if (before === note) continue
        if (before && before.rev !== note.rev) {
          knownRev.set(id, Math.max(knownRev.get(id) ?? 0, note.rev))
          continue
        }
        if (!before && note.rev > 0) {
          // Arrived from storage (another window), not typed here.
          knownRev.set(id, note.rev)
          continue
        }
        // Same rev, new object → an edit. A brand-new blank note waits until it has content.
        if (!before && note.content === '' && note.title === null && !note.locked) continue
        notes.schedule(id, 'save')
        markSaving()
      }
      for (const [id, before] of Object.entries(prev.notes)) {
        if (next.notes[id]) continue
        notes.cancel(id)
        if (!knownRev.get(id)) continue // never stored, nothing to delete
        notes.schedule(id, before.deletedAt !== null ? 'purge' : 'hard-delete')
        flushNow = true
      }
    }

    if (next.session !== prev.session) {
      meta.schedule('session', null)
      if (next.session.activeTabId !== prev.session.activeTabId) flushNow = true
      if (next.session.openTabIds.length < prev.session.openTabIds.length) flushNow = true
    }
    if (next.settings !== prev.settings) meta.schedule('settings', null)

    if (flushNow) void notes.flush()
  }

  const unsubscribe = store.subscribe(onChange)

  /** Synchronous safety net: IndexedDB may not finish before the page is gone. */
  const journalUnsaved = () => {
    const dirty = Object.values(s().notes).filter((n) => hasPendingFor(n.id))
    journaled = writeJournal({
      at: now(),
      notes: dirty,
      session: shouldPersistSession() ? s().session : undefined,
      settings: s().settings,
    })
  }

  const onHide = () => {
    journalUnsaved()
    void flush().then(settle)
  }
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') onHide()
  }
  const onFocus = () => {
    meta.schedule('session', null)
    void meta.flush()
  }
  target.addEventListener('pagehide', onHide)
  target.addEventListener('focus', onFocus)
  target.document.addEventListener('visibilitychange', onVisibility)

  return {
    flush,
    stop() {
      unsubscribe()
      clearTimeout(retryTimer)
      notes.dispose()
      meta.dispose()
      target.removeEventListener('pagehide', onHide)
      target.removeEventListener('focus', onFocus)
      target.document.removeEventListener('visibilitychange', onVisibility)
    },
    onConflict(cb) {
      conflictListeners.add(cb)
      return () => conflictListeners.delete(cb)
    },
    onWrite(cb) {
      writeListeners.add(cb)
      return () => writeListeners.delete(cb)
    },
    hasPendingFor,
    async saveSession() {
      meta.schedule('session', null)
      await meta.flush()
    },
    markSynced(id, rev) {
      knownRev.set(id, rev)
      notes.cancel(id)
      failed.delete(noteKey(id))
    },
  }
}
