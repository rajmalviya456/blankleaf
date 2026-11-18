import type { BlankleafDB } from '../db/db'
import { clearAllJournals } from './journal'
import type { Persistence } from './persistence'

/** Handles to the live storage, registered once at startup (main.tsx). */
let activeDb: BlankleafDB | null = null
let activePersistence: Persistence | null = null
let announceCleared: (() => void) | null = null

export function registerStorage(
  db: BlankleafDB | null,
  persistence: Persistence | null,
  announce: (() => void) | null = null,
): void {
  activeDb = db
  activePersistence = persistence
  announceCleared = announce
}

export function getActiveDb(): BlankleafDB | null {
  return activeDb
}

/**
 * Permanently erase every note, the session and settings, then reload.
 * Persistence is stopped first so page-hide doesn't journal the old session back.
 */
export async function clearAllData(reload: () => void = () => location.reload()): Promise<void> {
  // Other windows must stop saving first, or they would write their notes straight back.
  if (announceCleared) {
    announceCleared()
    await new Promise((r) => setTimeout(r, 150))
  }
  activePersistence?.stop()
  activePersistence = null
  if (activeDb) {
    await activeDb.delete()
    activeDb = null
  }
  clearAllJournals()
  reload()
}
