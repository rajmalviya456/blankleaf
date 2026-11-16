import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { exportAll } from './features/backup/actions'
import { initMeta } from './features/backup/meta'
import { setupPwa } from './pwa'
import { startSync, type Sync } from './features/sync/sync'
import { createShareHost } from './features/share/host'
import { pickTransport } from './features/share/pickTransport'
import { setShareHost } from './features/share/shareStore'
import { setPersistentStorageStatus } from './lib/storageStatus'
import { bootstrap, requestPersistentStorage } from './store/bootstrap'
import { registerStorage } from './store/dataReset'
import { startMemoryJournal } from './store/memoryJournal'
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
    if (typeof BroadcastChannel !== 'undefined') sync = startSync(store, boot.db, persistence)
    registerStorage(boot.db, persistence, sync ? () => sync?.announceCleared() : null)
    // Link sharing: resume serving any shares that are still running (PeerJS loads only then).
    const shareHost = createShareHost({
      db: boot.db,
      transport: pickTransport(),
      appUrl: new URL(import.meta.env.BASE_URL, location.origin).href,
    })
    setShareHost(shareHost)
    void shareHost.resume()
  } else {
    store.getState().setSaveStatus('error', boot.error)
    startMemoryJournal(store)
    toast(`${boot.error}. Export your notes before closing this tab.`, {
      tone: 'error',
      durationMs: 0,
      action: { label: 'Export now', run: () => void exportAll() },
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
