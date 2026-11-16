import { Contrast, Settings as SettingsIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { SettingsDialog } from '../features/settings/SettingsDialog'
import {
  applySettingsToDocument,
  nextThemePref,
  onSystemThemeChange,
  systemPrefersDark,
} from '../lib/theme'
import { getStore, useAppStore } from '../store/store'
import { Toaster } from '../ui/Toaster'
import { EditorArea } from './layout/EditorArea'
import { Rail } from './layout/Rail'
import { SidePanel } from './layout/SidePanel'
import { StatusBar } from './layout/StatusBar'
import { TabBar } from './layout/TabBar'

const iconButton =
  'grid size-7 place-items-center rounded-md text-fg-muted hover:bg-bg-hover hover:text-fg'

export function App() {
  const settings = useAppStore((s) => s.settings)
  const [systemDark, setSystemDark] = useState(systemPrefersDark)
  const s = () => getStore().getState()

  useEffect(() => onSystemThemeChange(setSystemDark), [])
  useEffect(() => applySettingsToDocument(settings, systemDark), [settings, systemDark])

  // ⌘, / Ctrl+, opens settings. Moves into the command registry in the shortcuts step.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.code === 'Comma') {
        e.preventDefault()
        s().setUi({ settingsOpen: true })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div data-testid="app-root" className="flex h-dvh w-dvw flex-col overflow-hidden">
      <TabBar
        actions={
          <>
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
              title="Settings (⌘,)"
              onClick={() => s().setUi({ settingsOpen: true })}
              className={iconButton}
            >
              <SettingsIcon size={15} strokeWidth={1.75} />
            </button>
          </>
        }
      />
      <div className="flex min-h-0 flex-1">
        <Rail />
        <SidePanel open={false} />
        <EditorArea />
      </div>
      <StatusBar />
      <SettingsDialog />
      <Toaster />
    </div>
  )
}
