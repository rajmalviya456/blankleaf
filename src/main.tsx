import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
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

  if (boot.db) {
    registerStorage(boot.db, startPersistence(store, boot.db))
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

  // Ask the browser not to evict our data under storage pressure.
  void requestPersistentStorage().then(setPersistentStorageStatus)
}

void main()
