import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { displayTitle } from '../../domain/title'
import { getStore, useAppStore } from '../../store/store'
import { DialogSurface } from '../../ui/DialogSurface'

/** "Unpin and close?" — shown when closing a pinned tab. */
export function UnpinPrompt() {
  const unpinId = useAppStore((s) => s.ui.unpinPromptId)
  const note = useAppStore((s) => (unpinId ? s.notes[unpinId] : null))
  const s = () => getStore().getState()
  const setUnpinId = (id: string | null) => s().setUi({ unpinPromptId: id })

  return (
    <AlertDialog.Root open={unpinId !== null} onOpenChange={(o) => !o && setUnpinId(null)}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="np-overlay fixed inset-0 z-40" />
        <DialogSurface
          kind="alert"
          className="fixed left-1/2 top-1/3 z-50 w-80 -translate-x-1/2 rounded-lg border border-border bg-bg-elev p-4 shadow-xl"
        >
          <AlertDialog.Title className="text-sm font-medium text-fg">
            Unpin “{note ? displayTitle(note) : ''}”?
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-1.5 text-[12.5px] text-fg-muted">
            Pinned notes always stay open. Unpin it to close the tab — the note itself is kept.
          </AlertDialog.Description>
          <div className="mt-4 flex justify-end gap-2">
            <AlertDialog.Cancel className="rounded-md px-3 py-1.5 text-[12.5px] text-fg-muted hover:bg-bg-hover">
              Cancel
            </AlertDialog.Cancel>
            <AlertDialog.Action
              className="rounded-md bg-accent px-3 py-1.5 text-[12.5px] text-accent-fg"
              onClick={() => {
                if (!unpinId) return
                s().togglePin(unpinId)
                s().closeTab(unpinId)
              }}
            >
              Unpin and close
            </AlertDialog.Action>
          </div>
        </DialogSurface>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
