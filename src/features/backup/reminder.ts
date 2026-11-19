import { WELCOME_CONTENT } from '../../domain/defaults'
import type { Note } from '../../domain/types'

const DAY = 86_400_000

/** Remind when backups are on, there is something worth saving, and the last one is too old. */
export function shouldRemindBackup(
  lastBackupAt: number | null,
  intervalDays: number,
  hasNonEmptyNotes: boolean,
  now: number,
): boolean {
  if (intervalDays <= 0 || !hasNonEmptyNotes) return false
  if (lastBackupAt === null) return true
  return now - lastBackupAt > intervalDays * DAY
}

/**
 * Something the person wrote and could lose: not the welcome (sample) note, which a first-time
 * visitor would otherwise be told to back up before typing a word.
 */
export function hasWrittenNotes(notes: Record<string, Note>): boolean {
  return Object.values(notes).some(
    (n) =>
      n.deletedAt === null && (n.locked || (n.content.trim() && n.content !== WELCOME_CONTENT)),
  )
}
