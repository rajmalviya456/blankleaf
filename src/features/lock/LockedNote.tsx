/**
 * A locked note. Its text exists only here, in this component's memory, while unlocked: the app's
 * store, storage, search, backups and sync only ever see the encrypted data. Leaving the note
 * locks it again.
 */
import CodeMirror from '@uiw/react-codemirror'
import { LockKeyhole, LockKeyholeOpen } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { effectiveEditorFontSize } from '../../domain/defaults'
import { displayTitle } from '../../domain/title'
import { useIsPhone } from '../../lib/media'
import { getStore, useAppStore } from '../../store/store'
import { toast } from '../../ui/toast'
import { calmEditorTheme } from '../editor/theme'
import { useEditorExtensions } from '../editor/useEditorExtensions'
import { seal, unseal, WrongPasswordError, type LockKey } from './lockCrypto'

const SAVE_DELAY = 300

function UnlockedEditor({
  noteId,
  lock,
  initial,
  onLock,
}: {
  noteId: string
  lock: LockKey
  initial: string
  onLock(): void
}) {
  const settings = useAppStore((s) => s.settings)
  const wrap = useAppStore((s) => s.notes[noteId]?.wrap ?? true)
  const phone = useIsPhone()
  const extensions = useEditorExtensions({
    wrap,
    settings: { ...settings, editorFontSize: effectiveEditorFontSize(settings, phone) },
  })
  const latest = useRef(initial)
  const unsaved = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const queue = useRef<Promise<void>>(Promise.resolve())

  // Only the encrypted text ever leaves this component.
  const saveNow = useRef(() => {
    clearTimeout(timer.current)
    if (!unsaved.current) return
    unsaved.current = false
    const text = latest.current
    queue.current = queue.current
      .then(async () =>
        getStore()
          .getState()
          .updateLocked(noteId, await seal(lock, noteId, text)),
      )
      .catch((e) => {
        console.error('Blankleaf: could not save the locked note', e)
        toast('Couldn’t save this locked note. Keep it open and try again.', { tone: 'error' })
      })
  })

  useEffect(() => {
    const save = saveNow.current
    const onHide = () => document.visibilityState === 'hidden' && save()
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', save)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', save)
      save()
    }
  }, [])

  const removeLock = () => {
    unsaved.current = false
    clearTimeout(timer.current)
    getStore().getState().removeLock(noteId, latest.current)
    toast('Lock removed. This note is no longer encrypted.')
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-9 shrink-0 flex-wrap items-center gap-2 border-b border-border bg-bg-sunken px-3 py-1 text-[12.5px] text-fg-muted">
        <LockKeyholeOpen size={14} className="shrink-0" />
        <span className="mr-auto">Unlocked until you leave this note</span>
        <button
          type="button"
          onClick={removeLock}
          className="rounded px-2 py-1 hover:bg-bg-hover hover:text-fg max-sm:min-h-11"
        >
          Remove lock
        </button>
        <button
          type="button"
          onClick={onLock}
          className="rounded bg-accent px-2 py-1 text-accent-fg max-sm:min-h-11 max-sm:px-3"
        >
          Lock now
        </button>
      </div>
      <CodeMirror
        value={initial}
        autoFocus
        onChange={(text) => {
          latest.current = text
          unsaved.current = true
          clearTimeout(timer.current)
          timer.current = setTimeout(saveNow.current, SAVE_DELAY)
        }}
        extensions={extensions}
        theme={calmEditorTheme}
        basicSetup={false}
        height="100%"
        className="h-full min-h-0 flex-1"
      />
    </div>
  )
}

export function LockedNote({ noteId }: { noteId: string }) {
  const title = useAppStore((s) => {
    const n = s.notes[noteId]
    return n ? displayTitle(n) : ''
  })
  const [open, setOpen] = useState<{ text: string; lock: LockKey } | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (open)
    return (
      <UnlockedEditor
        noteId={noteId}
        lock={open.lock}
        initial={open.text}
        onLock={() => setOpen(null)}
      />
    )

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const locked = getStore().getState().notes[noteId]?.locked
    if (!locked || !password || busy) return
    setBusy(true)
    setError(null)
    try {
      setOpen(await unseal(password, noteId, locked))
      setPassword('')
    } catch (err) {
      setError(
        err instanceof WrongPasswordError
          ? 'That password isn’t right.'
          : 'This note couldn’t be opened.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-0 flex-1 place-items-center overflow-y-auto p-4">
      <form onSubmit={(e) => void submit(e)} className="flex w-full max-w-xs flex-col gap-3">
        <LockKeyhole size={26} className="mx-auto text-fg-muted" />
        <h2 className="truncate text-center text-sm font-medium text-fg">{title}</h2>
        <p className="text-center text-[12.5px] text-fg-muted">This note is locked.</p>
        <input
          type="password"
          aria-label="Password"
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          aria-invalid={!!error}
          onChange={(e) => setPassword(e.target.value)}
          className="h-10 rounded-md border border-border bg-bg px-3 text-[14px] text-fg outline-none placeholder:text-fg-faint focus:border-accent max-sm:h-11 max-sm:text-[16px]"
        />
        {error && (
          <p role="alert" className="text-center text-[12.5px] text-danger">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={!password || busy}
          className="h-10 rounded-md bg-accent text-[13px] font-medium text-accent-fg disabled:opacity-40 max-sm:h-11"
        >
          {busy ? 'Unlocking…' : 'Unlock'}
        </button>
      </form>
    </div>
  )
}
