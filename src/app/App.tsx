import { Contrast, Settings as SettingsIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useGlobalShortcuts } from '../commands/useGlobalShortcuts'
import { ShortcutsSheet } from '../features/help/ShortcutsSheet'
import { CommandPalette } from '../features/palette/CommandPalette'
import { SettingsDialog } from '../features/settings/SettingsDialog'
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

const iconButton =
  'grid size-7 place-items-center rounded-md text-fg-muted hover:bg-bg-hover hover:text-fg'

export function App() {
  const settings = useAppStore((s) => s.settings)
  const [systemDark, setSystemDark] = useState(systemPrefersDark)
  const s = () => getStore().getState()

  useEffect(() => onSystemThemeChange(setSystemDark), [])
  useEffect(() => applySettingsToDocument(settings, systemDark), [settings, systemDark])

  useGlobalShortcuts()
  const zen = useAppStore((s) => s.session.zen)

  return (
    <div data-testid="app-root" className="flex h-dvh w-dvw flex-col overflow-hidden">
      {!zen && (
        <TabBar
          actions={
            <>
              <button
                type="button"
                aria-label="Command palette"
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
      <CommandPalette />
      <ShortcutsSheet />
      <SettingsDialog />
      <Toaster />
    </div>
  )
}
