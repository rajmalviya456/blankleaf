import { useEffect } from 'react'
import { getStore } from '../../store/store'
import { toast } from '../../ui/toast'
import { seenVersionCheck } from './whatsNew'

/** After an update, say so once and offer the release notes. */
export function useUpdateNotice(): void {
  useEffect(() => {
    // With site data blocked, even reading window.localStorage throws: then there's no notice.
    let storage: Storage
    try {
      storage = window.localStorage
    } catch {
      return
    }
    const change = seenVersionCheck(__APP_VERSION__, storage)
    if (!change) return
    toast(`Blankleaf was updated to ${change.to}.`, {
      durationMs: 12_000,
      action: {
        label: 'What’s new',
        run: () => getStore().getState().setUi({ whatsNewOpen: true }),
      },
    })
  }, [])
}
