import * as Dialog from '@radix-ui/react-dialog'
import { useState } from 'react'
import { useStore } from 'zustand'
import { DialogSurface } from '../../ui/DialogSurface'
import { setBackupPassword } from './backupKey'
import { backupPasswordStore } from './backupPasswordStore'

const field =
  'mt-1 w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-[13px] text-fg outline-none focus:border-accent max-sm:h-11'

const SAVE: Record<string, string> = {
  export: 'Save encrypted backup',
  folder: 'Turn on encrypted backup',
  set: 'Set password',
  change: 'Change password',
}

/** Set (or change) the backup password that every backup file is encrypted with. */
export function BackupPasswordDialog() {
  const asking = useStore(backupPasswordStore, (s) => s.asking)
  const [pw, setPw] = useState('')
  const [again, setAgain] = useState('')
  const [busy, setBusy] = useState(false)
  const answer = backupPasswordStore.getState().answer
  const reset = () => {
    setPw('')
    setAgain('')
    setBusy(false)
  }
  const mismatch = again.length > 0 && pw !== again
  const ready = pw.length > 0 && pw === again && !busy
  const save = async () => {
    if (!ready) return
    setBusy(true)
    await setBackupPassword(pw)
    reset()
    answer('set')
  }
  // Saving without a password makes sense for a one-off file or a folder, not in Settings.
  const canSkip = asking === 'export' || asking === 'folder'

  return (
    <Dialog.Root
      open={asking !== null}
      onOpenChange={(o) => {
        if (!o) {
          reset()
          answer('cancel')
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="np-overlay fixed inset-0 z-40" />
        <DialogSurface
          aria-describedby="backup-password-why"
          className="fixed left-1/2 top-[16vh] z-50 w-[min(420px,calc(100vw-32px))] -translate-x-1/2 rounded-xl border border-border bg-bg-elev p-4 shadow-2xl outline-none"
        >
          <Dialog.Title className="text-sm font-medium text-fg">
            {asking === 'change'
              ? 'Change the backup password'
              : 'Protect your backups with a password'}
          </Dialog.Title>
          <div id="backup-password-why" className="mt-1.5 space-y-1.5 text-[12.5px] text-fg-muted">
            <p>
              Backup files are encrypted with this password, so anyone who finds one can’t read your
              notes. This browser remembers it, so automatic backups keep working.
            </p>
            <p className="text-fg">
              Write it down: backups can’t be opened without it. Your notes here aren’t affected.
            </p>
            {asking === 'change' && (
              <p>Backups you already downloaded still open with the old password.</p>
            )}
          </div>
          <form
            className="mt-3 space-y-2"
            onSubmit={(e) => {
              e.preventDefault()
              void save()
            }}
          >
            <label className="block text-[12px] text-fg-muted">
              Backup password
              <input
                type="password"
                autoComplete="new-password"
                autoFocus
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                className={field}
              />
            </label>
            <label className="block text-[12px] text-fg-muted">
              Repeat password
              <input
                type="password"
                autoComplete="new-password"
                value={again}
                onChange={(e) => setAgain(e.target.value)}
                className={field}
              />
            </label>
            {mismatch && (
              <p role="alert" className="text-[12px] text-danger">
                The passwords don’t match
              </p>
            )}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              {canSkip && (
                <button
                  type="button"
                  onClick={() => {
                    reset()
                    answer('plain')
                  }}
                  className="mr-auto rounded-md px-2 py-1.5 text-[12px] text-fg-muted underline-offset-2 hover:underline max-sm:min-h-11"
                >
                  Save without a password
                </button>
              )}
              <Dialog.Close className="rounded-md px-3 py-1.5 text-[12.5px] text-fg-muted hover:bg-bg-hover max-sm:min-h-11">
                Cancel
              </Dialog.Close>
              <button
                type="submit"
                disabled={!ready}
                className="rounded-md bg-accent px-3 py-1.5 text-[12.5px] text-accent-fg disabled:opacity-40 max-sm:min-h-11"
              >
                {busy ? 'Encrypting…' : SAVE[asking ?? 'set']}
              </button>
            </div>
          </form>
        </DialogSurface>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
