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
