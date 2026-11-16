import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { initMeta } from './features/backup/meta'
import { setupPwa } from './pwa'
import { startSync, type Sync } from './features/sync/sync'
import { setPersistentStorageStatus } from './lib/storageStatus'
import { bootstrap, requestPersistentStorage } from './store/bootstrap'
import { registerStorage } from './store/dataReset'
import { startPersistence } from './store/persistence'
import { createAppStore, initStore } from './store/store'
import './styles/index.css'
import { toast } from './ui/toast'

async function main() {
  const root = document.getElementById('root')
  if (!root) throw new Error('Missing #root element')

  const boot = await bootstrap(Date.now())
  const store = initStore(createAppStore(boot.state))
  initMeta(boot.meta)

  if (boot.db) {
    let sync: Sync | null = null
    const persistence = startPersistence(store, boot.db, {
      // With several windows open, only the most recently used one owns the saved tab session.
      shouldPersistSession: () => sync?.ownsSession() ?? true,
    })
    registerStorage(boot.db, persistence)
    if (typeof BroadcastChannel !== 'undefined') sync = startSync(store, boot.db, persistence)
  } else {
    store.getState().setSaveStatus('error', boot.error)
    toast(`${boot.error}. Export your notes before closing this tab.`, {
      tone: 'error',
      durationMs: 0,
    })
  }

  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )

  if (import.meta.env.PROD) setupPwa()

  // Ask the browser not to evict our data under storage pressure.
  void requestPersistentStorage().then(setPersistentStorageStatus)
}

void main()
