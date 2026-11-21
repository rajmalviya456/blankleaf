/** Choose a password for a note. A centred dialog on laptops, a bottom sheet on phones. */
import * as Dialog from '@radix-ui/react-dialog'
import { LockKeyhole, TriangleAlert } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useStore } from 'zustand'
import { displayTitle } from '../../domain/title'
import { useAppStore } from '../../store/store'
import { DialogSurface } from '../../ui/DialogSurface'
import { toast } from '../../ui/toast'
import { lockNote, PASSWORD_MIN } from './lockNote'
import { lockStore } from './lockStore'

const field =
  'h-9 w-full rounded-md border border-border-field bg-bg px-2.5 text-[13px] text-fg outline-none focus:border-accent max-sm:h-11'

function Form({ noteId }: { noteId: string }) {
  const note = useAppStore((s) => s.notes[noteId])
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [understood, setUnderstood] = useState(false)
  const [busy, setBusy] = useState(false)
  const close = () => lockStore.getState().close()

  const tooShort = password.length > 0 && password.length < PASSWORD_MIN
  const mismatch = repeat.length > 0 && repeat !== password
  const ready = password.length >= PASSWORD_MIN && repeat === password && understood && !busy

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!ready) return
    setBusy(true)
    try {
      if (await lockNote(noteId, password)) {
        close()
        toast('Note locked.')
      }
    } catch (err) {
      console.error('Blankleaf: could not lock the note', err)
      setBusy(false)
      toast('Couldn’t lock this note. Its text hasn’t changed.', { tone: 'error' })
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <LockKeyhole size={16} className="shrink-0 text-fg-muted" />
        <div className="min-w-0">
          <Dialog.Title className="text-sm font-medium text-fg">Lock with password</Dialog.Title>
          {note && <p className="truncate text-[12px] text-fg-muted">{displayTitle(note)}</p>}
        </div>
      </div>
      <Dialog.Description className="flex gap-2 rounded-md bg-warn/10 p-2.5 text-[12.5px] leading-snug text-fg">
        <TriangleAlert size={15} className="mt-0.5 shrink-0 text-warn" />
        <span>
          <strong>If you forget this password, this note is gone for good.</strong> Nobody can reset
          it. Earlier versions are deleted and active share links stop. A title you chose stays
          visible.
        </span>
      </Dialog.Description>
      <div className="flex flex-col gap-1 text-[12.5px] text-fg-muted">
        <label htmlFor="lock-password">Password</label>
        <input
          id="lock-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={tooShort}
          aria-describedby={tooShort ? 'lock-password-error' : undefined}
          className={field}
          autoFocus
        />
        {tooShort && (
          <span id="lock-password-error" className="text-danger">
            Use at least {PASSWORD_MIN} characters.
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1 text-[12.5px] text-fg-muted">
        <label htmlFor="lock-repeat">Repeat password</label>
        <input
          id="lock-repeat"
          type="password"
          autoComplete="new-password"
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
          aria-invalid={mismatch}
          aria-describedby={mismatch ? 'lock-repeat-error' : undefined}
          className={field}
        />
        {mismatch && (
          <span id="lock-repeat-error" className="text-danger">
            The passwords don’t match.
          </span>
        )}
      </div>
      <label className="flex items-start gap-2 text-[12.5px] text-fg max-sm:min-h-11">
        <input
          type="checkbox"
          checked={understood}
          onChange={(e) => setUnderstood(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
        />
        I understand a forgotten password can’t be recovered.
      </label>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={close}
          className="rounded-md px-3 py-1.5 text-[12.5px] text-fg-muted hover:bg-bg-hover max-sm:min-h-11"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!ready}
          className="rounded-md bg-accent px-3 py-1.5 text-[12.5px] text-accent-fg disabled:opacity-40 max-sm:min-h-11"
        >
          {busy ? 'Locking…' : 'Lock note'}
        </button>
      </div>
    </form>
  )
}

export function LockDialog() {
  const noteId = useStore(lockStore, (s) => s.noteId)
  return (
    <Dialog.Root open={!!noteId} onOpenChange={(o) => !o && lockStore.getState().close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="np-overlay fixed inset-0 z-40" />
        <DialogSurface className="fixed left-1/2 top-[14vh] z-50 w-[min(420px,calc(100vw-32px))] -translate-x-1/2 rounded-lg border border-border bg-bg-elev p-4 shadow-xl">
          {noteId && <Form key={noteId} noteId={noteId} />}
        </DialogSurface>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
