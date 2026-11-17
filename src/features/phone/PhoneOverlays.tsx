/** Renders the phone overlays that are open, in stack order. Loaded lazily by PhoneShell. */
import { displayTitle } from '../../domain/title'
import { getStore } from '../../store/store'
import { ActionSheet } from './ActionSheet'
import { isTop, phoneStore, usePhone, type PhoneOverlay } from './phoneStore'
import { tabActionItems } from './tabActions'
import { TabsSheet } from './TabsSheet'
import { Library } from './Library'
import { NoteMenu } from './NoteMenu'
import { FormatSheet } from './FormatSheet'
import * as Dialog from '@radix-ui/react-dialog'
import { DialogSurface } from '../../ui/DialogSurface'
import { ActiveSharesList } from '../share/ActiveSharesList'
import { useActiveShares } from '../share/useActiveShares'

function SharesSheet({ open, onClose }: { open: boolean; onClose(): void }) {
  const shares = useActiveShares()
  return (
    <Dialog.Root open={open && shares.length > 0} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="np-overlay fixed inset-0 z-40" />
        <DialogSurface aria-describedby={undefined} className="fixed left-1/2 top-1/4 w-80">
          <Dialog.Title className="px-3 pb-1 text-[12px] font-semibold uppercase tracking-wider text-fg-faint">
            Active shares
          </Dialog.Title>
          <ActiveSharesList shares={shares} />
        </DialogSurface>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

const has = (stack: PhoneOverlay[], o: PhoneOverlay) => stack.some((x) => x === o)

export default function PhoneOverlays() {
  const stack = usePhone((p) => p.stack)
  /** Close `o` if it's on top (Escape / drag / outside tap only ever target the top one). */
  const closer = (o: PhoneOverlay) => () => {
    if (isTop(phoneStore.getState().stack, o)) phoneStore.getState().close()
  }
  const actions = stack.filter(
    (o): o is Extract<PhoneOverlay, { kind: 'tabActions' | 'noteActions' }> =>
      typeof o === 'object' && o.kind !== 'app',
  )

  return (
    <>
      <Library open={has(stack, 'library')} onClose={closer('library')} />
      <TabsSheet open={has(stack, 'tabs')} onClose={closer('tabs')} />
      <SharesSheet open={has(stack, 'shares')} onClose={closer('shares')} />
      <NoteMenu open={has(stack, 'menu')} onClose={closer('menu')} />
      <FormatSheet open={has(stack, 'format')} onClose={closer('format')} />
      {actions.map((o) => {
        const note = getStore().getState().notes[o.noteId]
        if (!note) return null
        return (
          <ActionSheet
            key={`${o.kind}:${o.noteId}`}
            open
            title={displayTitle(note)}
            items={o.kind === 'tabActions' ? tabActionItems(o.noteId) : []}
            onClose={closer(o)}
          />
        )
      })}
    </>
  )
}
