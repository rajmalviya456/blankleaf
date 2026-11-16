import { Contrast, Settings as SettingsIcon } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { useStore } from 'zustand'
import { importStore } from '../features/backup/importStore'
import { shareStore } from '../features/share/shareStore'
import { useGlobalShortcuts } from '../commands/useGlobalShortcuts'
import { DropZone } from '../features/backup/DropZone'
import { useBackupReminder } from '../features/backup/useBackupReminder'
import {
  applySettingsToDocument,
  nextThemePref,
  onSystemThemeChange,
  systemPrefersDark,
} from '../lib/theme'
import { platform } from '../lib/platform'
import { formatShortcut } from '../lib/shortcuts'
import { getStore, useAppStore } from '../store/store'
import { Toaster } from '../ui/Toaster'
import { EditorArea } from './layout/EditorArea'
import { Rail } from './layout/Rail'
import { SidePanel } from './layout/SidePanel'
import { StatusBar } from './layout/StatusBar'
import { TabBar } from './layout/TabBar'
import { ZenExitHint } from './layout/ZenExitHint'

// Dialogs load on first open so they don't weigh on startup.
const SettingsDialog = lazy(() =>
  import('../features/settings/SettingsDialog').then((m) => ({ default: m.SettingsDialog })),
)
const ShortcutsSheet = lazy(() =>
  import('../features/help/ShortcutsSheet').then((m) => ({ default: m.ShortcutsSheet })),
)
const CommandPalette = lazy(() =>
  import('../features/palette/CommandPalette').then((m) => ({ default: m.CommandPalette })),
)
const ShareDialog = lazy(() =>
  import('../features/share/ShareDialog').then((m) => ({ default: m.ShareDialog })),
)
const ImportDialog = lazy(() =>
  import('../features/backup/ImportDialog').then((m) => ({ default: m.ImportDialog })),
)

/** Mount each dialog the first time it opens, then keep it (so closing animations/state work). */
function Dialogs() {
  const palette = useAppStore((s) => s.ui.paletteOpen)
  const settings = useAppStore((s) => s.ui.settingsOpen)
  const shortcuts = useAppStore((s) => s.ui.shortcutsOpen)
  const importing = useStore(importStore, (s) => s.open)
  const sharing = useStore(shareStore, (s) => s.dialogNoteId !== null)
  const [seen, setSeen] = useState({ palette, settings, shortcuts, importing, sharing })
  if (
    (palette && !seen.palette) ||
    (settings && !seen.settings) ||
    (shortcuts && !seen.shortcuts) ||
    (importing && !seen.importing) ||
    (sharing && !seen.sharing)
  ) {
    setSeen({
      palette: seen.palette || palette,
      settings: seen.settings || settings,
      shortcuts: seen.shortcuts || shortcuts,
      importing: seen.importing || importing,
      sharing: seen.sharing || sharing,
    })
  }
  return (
    <Suspense fallback={null}>
      {seen.palette && <CommandPalette />}
      {seen.shortcuts && <ShortcutsSheet />}
      {seen.settings && <SettingsDialog />}
      {seen.importing && <ImportDialog />}
      {seen.sharing && <ShareDialog />}
    </Suspense>
  )
}

const iconButton =
  'grid size-7 place-items-center rounded-md text-fg-muted hover:bg-bg-hover hover:text-fg'

export function App() {
  const settings = useAppStore((s) => s.settings)
  const [systemDark, setSystemDark] = useState(systemPrefersDark)
  const s = () => getStore().getState()

  useEffect(() => onSystemThemeChange(setSystemDark), [])
  useEffect(() => applySettingsToDocument(settings, systemDark), [settings, systemDark])

  useGlobalShortcuts()
  useBackupReminder()
  const zen = useAppStore((s) => s.session.zen)

  return (
    <div data-testid="app-root" className="flex h-dvh w-dvw flex-col overflow-hidden">
      {!zen && (
        <TabBar
          actions={
            <>
              <button
                type="button"
                aria-label={`Command palette ${formatShortcut({ code: 'KeyK', mod: true }, platform())}`}
                title="Command palette"
                onClick={() => s().setUi({ paletteOpen: true, paletteMode: 'commands' })}
                className="mr-1 rounded-md border border-border px-1.5 py-0.5 text-[11px] text-fg-muted hover:bg-bg-hover hover:text-fg"
              >
                {formatShortcut({ code: 'KeyK', mod: true }, platform())}
              </button>
              <button
                type="button"
                aria-label={`Theme: ${settings.theme}`}
                title={`Theme: ${settings.theme}`}
                onClick={() => s().updateSettings({ theme: nextThemePref(settings.theme) })}
                className={iconButton}
              >
                <Contrast size={15} strokeWidth={1.75} />
              </button>
              <button
                type="button"
                aria-label="Settings"
                title="Settings"
                onClick={() => s().setUi({ settingsOpen: true })}
                className={iconButton}
              >
                <SettingsIcon size={15} strokeWidth={1.75} />
              </button>
            </>
          }
        />
      )}
      <div className="flex min-h-0 flex-1">
        {!zen && <Rail />}
        {!zen && <SidePanel />}
        <EditorArea />
      </div>
      {!zen && <StatusBar />}
      {zen && <ZenExitHint />}
      <Dialogs />
      <DropZone />
      <Toaster />
    </div>
  )
}
