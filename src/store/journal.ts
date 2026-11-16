/**
 * Emergency journal of unsaved work, written *synchronously* to localStorage when the page
 * is hidden or unloading. IndexedDB writes are async and can be cut off by a fast reload or
 * tab close; localStorage is synchronous, so whatever was typed survives.
 *
 * Each window writes its own key, so one window can never overwrite or clear another's
 * safety net. Startup replays every journal (newer-wins by updatedAt) and removes each one
 * only after it has been applied.
 */
import type { Note, Session, Settings } from '../domain/types'

export const JOURNAL_PREFIX = 'notepadz:unsaved:'
/** Pre-1.0 single-key journal, still read so nothing written by older builds is lost. */
const LEGACY_KEY = 'notepadz:unsaved'

const WINDOW_ID = crypto.randomUUID()

export interface Journal {
  at: number
  notes: Note[]
  /** Omitted by windows that shouldn't own the saved session. */
  session?: Session
  settings: Settings
}

/** This window's journal key. */
export function journalKey(): string {
  return JOURNAL_PREFIX + WINDOW_ID
}

function storage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function parse(raw: string | null | undefined): Journal | null {
  if (!raw) return null
  try {
    const j = JSON.parse(raw) as Partial<Journal>
    if (typeof j.at !== 'number' || !Array.isArray(j.notes) || !j.settings) return null
    return j as Journal
  } catch {
    return null
  }
}

/** Returns false if the journal could not be written (storage full or unavailable). */
export function writeJournal(j: Journal, key: string = journalKey()): boolean {
  try {
    storage()?.setItem(key, JSON.stringify(j))
    return true
  } catch {
    return false
  }
}

export function readJournal(key: string = journalKey()): Journal | null {
  try {
    return parse(storage()?.getItem(key))
  } catch {
    return null
  }
}

/** Every window's journal (including the legacy key), oldest first. */
export function readAllJournals(): { key: string; journal: Journal }[] {
  const store = storage()
  if (!store) return []
  const out: { key: string; journal: Journal }[] = []
  try {
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i)
      if (!key || (key !== LEGACY_KEY && !key.startsWith(JOURNAL_PREFIX))) continue
      const journal = parse(store.getItem(key))
      if (journal) out.push({ key, journal })
    }
  } catch {
    return out
  }
  return out.sort((a, b) => a.journal.at - b.journal.at)
}

export function clearJournal(key: string = journalKey()): void {
  try {
    storage()?.removeItem(key)
  } catch {
    // ignore
  }
}

/** Remove every window's journal (used by "Clear all data"). */
export function clearAllJournals(): void {
  for (const { key } of readAllJournals()) clearJournal(key)
  clearJournal(LEGACY_KEY)
}
