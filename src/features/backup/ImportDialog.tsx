import * as Dialog from '@radix-ui/react-dialog'
import { useState } from 'react'
import { useStore } from 'zustand'
import { toast } from '../../ui/toast'
import { applyImport } from './actions'
import { importStore } from './importStore'
import { DialogSurface } from '../../ui/DialogSurface'

const plural = (n: number, word: string) => (n === 1 ? word : `${word}s`)

/** Summary of what a backup import will change, with an explicit Import button. */
export function ImportDialog() {
  const { open, fileName, plan, error, close } = useStore(importStore)
  const [restoreDeleted, setRestoreDeleted] = useState(false)

  const nothing = plan && !plan.add.length && !plan.update.length && !plan.deletedRestorable.length

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          close()
          setRestoreDeleted(false)
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="np-overlay fixed inset-0 z-40" />
        <DialogSurface
          aria-describedby={undefined}
          className="fixed left-1/2 top-[20vh] z-50 w-[min(400px,calc(100vw-32px))] -translate-x-1/2 rounded-xl border border-border bg-bg-elev p-4 shadow-2xl outline-none"
        >
          <Dialog.Title className="text-sm font-medium text-fg">Import backup</Dialog.Title>
          <p className="mt-0.5 truncate text-[11.5px] text-fg-faint">{fileName}</p>

          {error ? (
            <p role="alert" className="mt-3 text-[12.5px] text-danger">
              {error} Nothing was changed.
            </p>
          ) : plan ? (
            <div className="mt-3 space-y-2 text-[12.5px] text-fg-muted">
              <ul className="space-y-0.5">
                {plan.add.length > 0 && (
                  <li>
                    <strong className="text-fg">{plan.add.length} new</strong>{' '}
                    {plural(plan.add.length, 'note')} will be added
                  </li>
                )}
                {plan.update.length > 0 && (
                  <li>
                    <strong className="text-fg">{plan.update.length} updated</strong> — the backup
                    copy is newer
                  </li>
                )}
                {plan.olderSkipped > 0 && (
                  <li>{plan.olderSkipped} skipped — your copy here is newer</li>
                )}
                {plan.unchanged > 0 && <li>{plan.unchanged} already up to date</li>}
              </ul>
              {plan.deletedRestorable.length > 0 && (
                <label className="flex items-start gap-2 rounded-md bg-bg-sunken p-2">
                  <input
                    type="checkbox"
                    checked={restoreDeleted}
                    onChange={(e) => setRestoreDeleted(e.target.checked)}
                    className="mt-0.5 accent-[var(--accent)]"
                  />
                  <span>
                    Also restore {plan.deletedRestorable.length}{' '}
                    {plural(plan.deletedRestorable.length, 'note')} you permanently deleted here
                  </span>
                </label>
              )}
              {nothing && !plan.deletedRestorable.length && (
                <p>Everything in this backup is already here.</p>
              )}
            </div>
          ) : null}

          <div className="mt-4 flex justify-end gap-2">
            <Dialog.Close className="rounded-md px-3 py-1.5 text-[12.5px] text-fg-muted hover:bg-bg-hover">
              {error || nothing ? 'Close' : 'Cancel'}
            </Dialog.Close>
            {plan && !error && (
              <button
                type="button"
                disabled={Boolean(nothing) && !restoreDeleted}
                onClick={async () => {
                  const count = await applyImport(plan, restoreDeleted)
                  close()
                  setRestoreDeleted(false)
                  toast(`Imported ${count} note${count === 1 ? '' : 's'}.`)
                }}
                className="rounded-md bg-accent px-3 py-1.5 text-[12.5px] text-accent-fg disabled:opacity-40"
              >
                Import
              </button>
            )}
          </div>
        </DialogSurface>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
