import { useEffect } from 'react'
import { getStore } from '../../store/store'
import { toast } from '../../ui/toast'
import { seenVersionCheck } from './whatsNew'

/** After an update, say so once and offer the release notes. */
export function useUpdateNotice(): void {
  useEffect(() => {
    const change = seenVersionCheck(__APP_VERSION__, window.localStorage)
    if (!change) return
    toast(`Notepadz was updated to ${change.to}.`, {
      durationMs: 12_000,
      action: {
        label: 'What’s new',
        run: () => getStore().getState().setUi({ whatsNewOpen: true }),
      },
    })
  }, [])
}
