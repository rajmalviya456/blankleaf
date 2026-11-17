/**
 * Phone layout (< 640px): one note fills the screen under a slim top bar; tabs, the library
 * and note actions open as overlays. Same store and tab model as the laptop layout.
 */
import { EditorArea } from '../../app/layout/EditorArea'
import { ZenExitHint } from '../../app/layout/ZenExitHint'
import { useAppStore } from '../../store/store'
import { PhoneTopBar } from './PhoneTopBar'
import { usePhone } from './phoneStore'
import { phoneViewFor } from './phoneView'
import { useBackToClose } from './useBackToClose'
import { useKeyboardInset } from './useKeyboardInset'
import { PhoneToolbarDock } from './PhoneToolbarDock'
import { lazy, Suspense, useEffect, type CSSProperties } from 'react'
import { UnpinPrompt } from '../tabs/UnpinPrompt'

const PhoneOverlays = lazy(() => import('./PhoneOverlays'))

export function PhoneShell() {
  useBackToClose()
  const zen = useAppStore((s) => s.session.zen)
  const activeId = useAppStore((s) => s.session.activeTabId)
  const saved = useAppStore((s) => (activeId ? s.session.perTab[activeId]?.previewMode : undefined))
  const previewByTab = usePhone((p) => p.previewByTab)
  const view = activeId ? phoneViewFor(previewByTab, activeId, saved) : 'edit'
  const showToolbar = useAppStore((s) => s.settings.showToolbar)
  const kb = useKeyboardInset()
  // Toasts live outside the shell, so share the keyboard height on the root too.
  useEffect(() => {
    document.documentElement.style.setProperty('--kb', `${kb}px`)
    return () => {
      document.documentElement.style.removeProperty('--kb')
    }
  }, [kb])
  const markdown = useAppStore((s) => (activeId ? s.notes[activeId]?.mode === 'markdown' : false))
  const dock = activeId && !zen && showToolbar && !(markdown && view === 'preview')

  return (
    <div
      data-testid="phone-shell"
      style={{ '--kb': `${kb}px` } as CSSProperties}
      className="flex h-dvh w-dvw flex-col overflow-hidden bg-bg pt-[env(safe-area-inset-top)] pb-[var(--kb)]"
    >
      {!zen && <PhoneTopBar />}
      <EditorArea viewOverride={view} showToolbar={false} />
      {dock && <PhoneToolbarDock noteId={activeId} />}
      {zen && <ZenExitHint />}
      <Suspense fallback={null}>
        <PhoneOverlays />
      </Suspense>
      <UnpinPrompt />
    </div>
  )
}
