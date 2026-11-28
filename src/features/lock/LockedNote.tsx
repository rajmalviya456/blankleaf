import type { LockedContent } from '../../domain/types'
/**
 * A locked note. Its text exists only here, in this component's memory, while unlocked: the app's
 * store, storage, search, backups and sync only ever see the encrypted data. Leaving the note
 * locks it again.
 */
import CodeMirror from '@uiw/react-codemirror'
import { LockKeyhole, LockKeyholeOpen } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useNoteFont } from '../editor/useNoteFont'
import { useNoteFontSize } from '../editor/useNoteFontSize'
import { displayTitle } from '../../domain/title'
import { getStore, useAppStore } from '../../store/store'
import { toast } from '../../ui/toast'
import { calmEditorTheme } from '../editor/theme'
import { useSpellCheck } from '../spell/useSpellCheck'
import { useEditorExtensions } from '../editor/useEditorExtensions'
import { seal, unseal, unsealWith, WrongPasswordError, type LockKey } from './lockCrypto'

const SAVE_DELAY = 300

/** Save text typed in one window as a new locked note, when another window changed the note. */
function keepCopy(noteId: string, sealed: LockedContent) {
  const s = getStore().getState()
  const title = `${displayTitle(s.notes[noteId] ?? { title: null, content: '' })} (conflict copy)`
  s.newNote({ id: crypto.randomUUID(), title, content: '', locked: sealed })
  if (s.notes[noteId]) s.setActive(noteId)
  toast('Edited in another window — your version was saved as a locked copy.', { tone: 'warn' })
}

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
  const spellcheck = useAppStore((s) => s.settings.spellcheck)
  const stored = useAppStore((s) => s.notes[noteId]?.locked)
  const fontSize = useNoteFontSize(noteId)
  const font = useNoteFont(noteId)
  const editorBase = useEditorExtensions({
    wrap,
    settings: { ...settings, editorFontSize: fontSize, editorFont: font },
  })
  const spell = useSpellCheck(spellcheck)
  const extensions = useMemo(
    () => (spell ? [...editorBase, spell] : editorBase),
    [editorBase, spell],
  )
  const [shown, setShown] = useState({ text: initial, version: 0 })
  const latest = useRef(initial)
  /** The encrypted version this window is editing on top of. */
  const base = useRef(getStore().getState().notes[noteId]?.locked)
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
      .then(async () => {
        const sealed = await seal(lock, text)
        const s = getStore().getState()
        const current = s.notes[noteId]
        // Another window removed the lock meanwhile: keep this text as a locked copy, since
        // nothing below will see a newer locked version to compare it with.
        if (current && !current.locked && current.content !== text) {
          keepCopy(noteId, sealed)
          return
        }
        // Another window saved first: `stored` below keeps this text as a copy instead.
        if (current?.locked !== base.current) return void (unsaved.current = true)
        base.current = sealed
        s.updateLocked(noteId, sealed)
      })
      .catch((e) => {
        console.error('Blankleaf: could not save the locked note', e)
        toast('Couldn’t save this locked note. Keep it open and try again.', { tone: 'error' })
      })
  })

  // Another window changed this note: show its text, keeping anything typed here as a copy.
  useEffect(() => {
    if (!stored || stored === base.current) return
    let alive = true
    const incoming = stored
    void queue.current.then(async () => {
      if (!alive || incoming === base.current) return
      const text = await unsealWith(lock, incoming).catch(() => null)
      if (text === null || !alive) return
      if (unsaved.current && latest.current !== text)
        keepCopy(noteId, await seal(lock, latest.current))
      clearTimeout(timer.current)
      unsaved.current = false
      base.current = incoming
      latest.current = text
      setShown((v) => ({ text, version: v.version + 1 }))
    })
    return () => {
      alive = false
    }
  }, [stored, lock, noteId])

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

  // After any save or incoming edit in progress, so a newer edit from another window is kept.
  const removeLock = () => {
    clearTimeout(timer.current)
    queue.current = queue.current.then(async () => {
      const now = getStore().getState().notes[noteId]?.locked
      if (!now) return
      let text = latest.current
      if (now !== base.current) {
        const remote = await unsealWith(lock, now).catch(() => null)
        if (remote !== null) {
          // Typed here too: that text is kept as a copy (unlocked, as this note is about to be).
          if (unsaved.current && remote !== latest.current) {
            const s = getStore().getState()
            const title = `${displayTitle(s.notes[noteId] ?? { title: null, content: '' })} (conflict copy)`
            s.newNote({ title, content: latest.current })
            s.setActive(noteId)
          }
          text = remote
        }
      }
      unsaved.current = false
      getStore().getState().removeLock(noteId, text)
      toast('Lock removed. This note is no longer encrypted.')
    })
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
        key={shown.version}
        value={shown.text}
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
      setOpen(await unseal(password, locked))
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
          className="h-10 rounded-md border border-border-field bg-bg px-3 text-[14px] text-fg outline-none placeholder:text-fg-faint focus:border-accent max-sm:h-11 max-sm:text-[16px]"
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
