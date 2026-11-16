import { useEffect, useState } from 'react'
import { Contrast } from 'lucide-react'
import {
  applyTheme,
  nextThemePref,
  onSystemThemeChange,
  resolveTheme,
  systemPrefersDark,
  type ThemePref,
} from '../lib/theme'
import { EditorArea } from './layout/EditorArea'
import { Rail } from './layout/Rail'
import { SidePanel } from './layout/SidePanel'
import { StatusBar } from './layout/StatusBar'
import { TabBar } from './layout/TabBar'
import { getStore, useAppStore } from '../store/store'
import { Toaster } from '../ui/Toaster'

export function App() {
  const themePref = useAppStore((s) => s.settings.theme)
  const setThemePref = (next: (p: ThemePref) => ThemePref) =>
    getStore()
      .getState()
      .updateSettings({ theme: next(themePref) })
  const [systemDark, setSystemDark] = useState(systemPrefersDark)

  useEffect(() => onSystemThemeChange(setSystemDark), [])
  useEffect(() => applyTheme(resolveTheme(themePref, systemDark)), [themePref, systemDark])

  return (
    <div data-testid="app-root" className="flex h-dvh w-dvw flex-col overflow-hidden">
      <TabBar
        actions={
          <button
            type="button"
            aria-label={`Theme: ${themePref}`}
            title={`Theme: ${themePref}`}
            onClick={() => setThemePref(nextThemePref)}
            className="grid size-7 place-items-center rounded-md text-fg-muted hover:bg-bg-hover hover:text-fg"
          >
            <Contrast size={15} strokeWidth={1.75} />
          </button>
        }
      />
      <div className="flex min-h-0 flex-1">
        <Rail />
        <SidePanel open={false} />
        <EditorArea />
      </div>
      <StatusBar />
      <Toaster />
    </div>
  )
}
