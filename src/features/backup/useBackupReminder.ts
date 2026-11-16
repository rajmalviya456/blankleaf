import { useEffect } from 'react'
import { getStore } from '../../store/store'
import { toast } from '../../ui/toast'
import { exportAll } from './actions'
import { getLastBackupAt } from './meta'
import { shouldRemindBackup } from './reminder'

const CHECK_EVERY_MS = 60 * 60 * 1000

/** At most one "time to back up" toast per session, checked at start and hourly. */
export function useBackupReminder(): void {
  useEffect(() => {
    let shown = false
    const check = () => {
      if (shown) return
      const s = getStore().getState()
      const hasNotes = Object.values(s.notes).some((n) => n.deletedAt === null && n.content.trim())
      if (
        !shouldRemindBackup(getLastBackupAt(), s.settings.backupReminderDays, hasNotes, Date.now())
      )
        return
      shown = true
      toast('Your notes live only in this browser. Save a backup file now and then.', {
        tone: 'warn',
        durationMs: 0,
        action: { label: 'Export backup', run: () => void exportAll() },
      })
    }
    const first = setTimeout(check, 5000)
    const timer = setInterval(check, CHECK_EVERY_MS)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
    }
  }, [])
}
