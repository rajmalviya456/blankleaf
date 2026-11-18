import { registerSW } from 'virtual:pwa-register'
import { toast } from './ui/toast'

/** Register the service worker; offer (never force) a reload when a new version is ready. */
export function setupPwa(): void {
  if (!('serviceWorker' in navigator)) return
  const update = registerSW({
    onNeedRefresh() {
      toast('A new version of Blankleaf is ready.', {
        durationMs: 0,
        action: { label: 'Reload', run: () => void update(true) },
      })
    },
    onOfflineReady() {
      toast('Blankleaf now works offline.')
    },
  })
}
