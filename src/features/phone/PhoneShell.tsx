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

export function PhoneShell() {
  useBackToClose()
  const zen = useAppStore((s) => s.session.zen)
  const activeId = useAppStore((s) => s.session.activeTabId)
  const saved = useAppStore((s) => (activeId ? s.session.perTab[activeId]?.previewMode : undefined))
  const previewByTab = usePhone((p) => p.previewByTab)
  const view = activeId ? phoneViewFor(previewByTab, activeId, saved) : 'edit'

  return (
    <div
      data-testid="phone-shell"
      className="flex h-dvh w-dvw flex-col overflow-hidden bg-bg pt-[env(safe-area-inset-top)]"
    >
      {!zen && <PhoneTopBar />}
      <EditorArea viewOverride={view} showToolbar={false} />
      {zen && <ZenExitHint />}
    </div>
  )
}
