import { useEffect } from 'react'
import { getStore } from '../../store/store'
import { toast } from '../../ui/toast'
import { exportAll } from './actions'
import { getLastBackupAt } from './meta'
import { hasWrittenNotes, shouldRemindBackup } from './reminder'

const CHECK_EVERY_MS = 60 * 60 * 1000

/** At most one "time to back up" toast per session: at start, hourly, and after zen mode. */
export function useBackupReminder(): void {
  useEffect(() => {
    let shown = false
    const check = () => {
      if (shown) return
      const s = getStore().getState()
      // Not over the page while someone is writing in zen: asked again once it's over.
      if (s.session.zen) return
      const hasNotes = hasWrittenNotes(s.notes)
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
    let first = setTimeout(check, 5000)
    const timer = setInterval(check, CHECK_EVERY_MS)
    const unsubscribe = getStore().subscribe((s, prev) => {
      if (prev.session.zen && !s.session.zen) {
        clearTimeout(first)
        first = setTimeout(check, 5000)
      }
    })
    return () => {
      clearTimeout(first)
      clearInterval(timer)
      unsubscribe()
    }
  }, [])
}
