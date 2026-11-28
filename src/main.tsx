import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { AppErrorBoundary } from './app/AppErrorBoundary'
import { exportAll } from './features/backup/actions'
import { startFolderBackup } from './features/backup/folderBackup'
import { initMeta } from './features/backup/meta'
import {
  openLaunchedFiles,
  runLaunchShortcut,
  takeLaunchShortcut,
  takeSharedNote,
} from './features/launch/launch'
import { setupPwa } from './pwa'
import { startSync, type Sync } from './features/sync/sync'
import { createShareHost } from './features/share/host'
import { parseShareHash } from './features/share/link'
import { pickTransport } from './features/share/pickTransport'
import { setShareHost } from './features/share/shareStore'
import { stopSharesOfDeletedNotes } from './features/share/stopSharesOfDeletedNotes'
import { setPersistentStorageStatus } from './lib/storageStatus'
import { applySettingsToDocument, savedTheme, systemPrefersDark } from './lib/theme'
import { DEFAULT_SETTINGS } from './domain/defaults'
import type { Note } from './domain/types'
import { bootstrap, requestPersistentStorage } from './store/bootstrap'
import { registerMemoryJournal, registerStorage } from './store/dataReset'
import { isFreshVisit, startOnBlankLeaf } from './store/freshStart'
import { startMemoryJournal } from './store/memoryJournal'
import { startPersistence } from './store/persistence'
import { createAppStore, getStore, initStore } from './store/store'
import './styles/index.css'
import { toast } from './ui/toast'
import { renameStorageKeys } from './lib/renameStorageKeys'

// Before anything reads storage: carry over keys saved under the app's old name.
renameStorageKeys()

const rootEl = () => {
  const root = document.getElementById('root')
  if (!root) throw new Error('Missing #root element')
  return root
}

/** Start the full app. `addNote` (from "Save to my notes") is added and opened after boot. */
export async function bootApp(opts: { addNote?: Partial<Note> } = {}): Promise<void> {
  const root = rootEl()
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
    stopSharesOfDeletedNotes(store, shareHost)
    void shareHost.resume()
    void startFolderBackup(store, boot.db)
  } else {
    store.getState().setSaveStatus('error', boot.error)
    registerMemoryJournal(startMemoryJournal(store))
    toast(`${boot.error}. Export your notes before closing this tab.`, {
      tone: 'error',
      durationMs: 0,
      action: { label: 'Export now', run: () => void exportAll() },
    })
  }

  if (opts.addNote) store.getState().newNote(opts.addNote)
  else if (!boot.firstRun && isFreshVisit()) startOnBlankLeaf(store)

  createRoot(root).render(
    <StrictMode>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </StrictMode>,
  )

  if (import.meta.env.PROD) setupPwa()

  // Ask the browser not to evict our data under storage pressure.
  void requestPersistentStorage().then(setPersistentStorageStatus)
}

/**
 * A share link (#/s/…) opens the lightweight recipient view without booting the app, so
 * nothing is written to this browser until the recipient chooses Save or Close.
 */
async function main() {
  const parts = parseShareHash(location.hash)
  if (!parts) {
    const shared = takeSharedNote()
    const shortcut = takeLaunchShortcut()
    await bootApp(shared ? { addNote: shared } : {})
    if (shortcut) runLaunchShortcut(shortcut, getStore())
    openLaunchedFiles()
    return
  }
  // Keep the key out of the address bar and history once read.
  history.replaceState(null, '', location.pathname + location.search)
  // The person's own theme, without saving anything: their settings load only if they open the app.
  applySettingsToDocument(
    { ...DEFAULT_SETTINGS, theme: savedTheme() ?? DEFAULT_SETTINGS.theme },
    systemPrefersDark(),
    false,
  )
  const [{ ShareView }, { downloadText }] = await Promise.all([
    import('./features/share/ShareView'),
    import('./features/backup/download'),
  ])
  const shareRoot = createRoot(rootEl())
  const handOver = (addNote?: Partial<Note>) => {
    shareRoot.unmount()
    void bootApp({ addNote })
  }
  shareRoot.render(
    <StrictMode>
      <ShareView
        parts={parts}
        transport={pickTransport()}
        onSave={(n) => handOver(n)}
        onClose={() => handOver()}
        onDownload={(f) => downloadText(f.name, f.mime, f.text)}
      />
    </StrictMode>,
  )
}

// A share link pasted into an already-open Blankleaf tab only changes the hash; reload so it
// goes through the share entry point (and the key leaves the address bar).
window.addEventListener('hashchange', () => {
  if (parseShareHash(location.hash)) location.reload()
})

void main()
