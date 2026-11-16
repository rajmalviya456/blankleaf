/**
 * Emergency journal of unsaved work, written *synchronously* to localStorage when the page
 * is hidden or unloading. IndexedDB writes are async and can be cut off by a fast reload or
 * tab close; localStorage is synchronous, so whatever was typed survives. Startup replays
 * the journal into IndexedDB (newer-wins by updatedAt) and clears it.
 */
import type { Note, Session, Settings } from '../domain/types'

export const JOURNAL_KEY = 'notepadz:unsaved'

export interface Journal {
  at: number
  notes: Note[]
  session: Session
  settings: Settings
}

function storage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** Returns false if the journal could not be written (storage full or unavailable). */
export function writeJournal(j: Journal): boolean {
  try {
    storage()?.setItem(JOURNAL_KEY, JSON.stringify(j))
    return true
  } catch {
    return false
  }
}

export function readJournal(): Journal | null {
  try {
    const raw = storage()?.getItem(JOURNAL_KEY)
    if (!raw) return null
    const j = JSON.parse(raw) as Partial<Journal>
    if (typeof j.at !== 'number' || !Array.isArray(j.notes) || !j.session || !j.settings)
      return null
    return j as Journal
  } catch {
    return null
  }
}

export function clearJournal(): void {
  try {
    storage()?.removeItem(JOURNAL_KEY)
  } catch {
    // ignore
  }
}
