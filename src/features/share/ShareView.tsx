/**
 * Recipient page for a share link (spec §5.3). Deliberately lightweight: it doesn't open the
 * notes database or touch the recipient's notes. Save/Close hand over to the full app.
 */
import { EditorView } from '@codemirror/view'
import CodeMirror from '@uiw/react-codemirror'
import { AlertTriangle, Clock, Download, Lock, Save, WifiOff, X } from 'lucide-react'
import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { DEFAULT_SETTINGS, newNoteDraft } from '../../domain/defaults'
import { displayTitle } from '../../domain/title'
import type { Note } from '../../domain/types'
import { noteExportFile } from '../backup/importFiles'
import { calmSyntax } from '../editor/highlight'
import { loadLanguage } from '../editor/languages'
import { calmEditorTheme } from '../editor/theme'
import { useCountdown } from './countdown'
import type { Snapshot } from './crypto'
import type { ShareLinkParts } from './link'
import { createReceiver, type Receiver, type ReceiveState } from './receiver'
import type { ShareTransport } from './transport'

const MarkdownPreview = lazy(() =>
  import('../editor/MarkdownPreview').then((m) => ({ default: m.MarkdownPreview })),
)

export interface SavedShare {
  title: string
  content: string
  language: Note['language']
  mode: Note['mode']
}

interface Props {
  parts: ShareLinkParts
  transport: ShareTransport
  onSave(note: SavedShare): void
  onClose(): void
  onDownload(file: { name: string; mime: string; text: string }): void
}

const button =
  'flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-[12.5px] text-fg hover:bg-bg-hover max-sm:h-11 max-sm:text-[14px]'
const primary =
  'flex h-8 items-center gap-1.5 rounded-md bg-accent px-4 text-[12.5px] font-medium text-accent-fg disabled:opacity-40 max-sm:h-11 max-sm:text-[14px]'

function asNote(s: Snapshot): Note {
  return {
    ...newNoteDraft(0, DEFAULT_SETTINGS),
    title: s.title || null,
    content: s.content,
    language: s.language,
    mode: s.mode,
  }
}

function Card({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="mx-auto mt-[14vh] w-[min(420px,calc(100vw-32px))] rounded-xl border border-border bg-bg-elev p-6 text-center shadow-xl">
      <div className="mx-auto mb-3 grid size-10 place-items-center rounded-full bg-accent-soft text-accent">
        {icon}
      </div>
      <h1 className="text-[15px] font-semibold text-fg">{title}</h1>
      <div className="mt-2 space-y-3 text-[12.5px] leading-snug text-fg-muted">{children}</div>
    </div>
  )
}

function PasswordForm({
  wrong,
  cooldownUntil,
  onSubmit,
}: {
  wrong: boolean
  cooldownUntil?: number
  onSubmit(pw: string): void
}) {
  const [pw, setPw] = useState('')
  const wait = useCountdown(cooldownUntil ?? 0)
  const blocked = cooldownUntil !== undefined && !wait.expired
  return (
    <form
      className="space-y-2 text-left"
      onSubmit={(e) => {
        e.preventDefault()
        if (pw && !blocked) onSubmit(pw)
      }}
    >
      <label htmlFor="share-password" className="sr-only">
        Password
      </label>
      <input
        id="share-password"
        autoFocus
        type="password"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        placeholder="Password"
        autoComplete="off"
        aria-invalid={wrong}
        className="h-9 w-full rounded-md border border-border bg-bg px-3 text-[13px] text-fg outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)] aria-[invalid=true]:border-danger"
      />
      {wrong && !blocked && <p className="text-[12px] text-danger">Wrong password. Try again.</p>}
      {blocked && (
        <p className="text-[12px] text-warn">Too many wrong attempts. Try again in {wait.label}.</p>
      )}
      <button
        type="submit"
        disabled={!pw || blocked}
        className={primary + ' w-full justify-center'}
      >
        Open note
      </button>
    </form>
  )
}

function ReadyView({
  snapshot,
  expiresAt,
  onSave,
  onClose,
  onDownload,
}: { snapshot: Snapshot; expiresAt: number } & Omit<Props, 'parts' | 'transport'>) {
  const { label, expired } = useCountdown(expiresAt)
  const note = useMemo(() => asNote(snapshot), [snapshot])
  const title = displayTitle(note)
  const [lang, setLang] = useState<import('@codemirror/state').Extension | null>(null)
  const [preview, setPreview] = useState(snapshot.mode === 'markdown')
  const lineWrap =
    snapshot.mode === 'markdown' ||
    snapshot.language === 'auto' ||
    snapshot.language === 'plaintext'

  useEffect(() => {
    let alive = true
    const id =
      snapshot.language === 'auto' && snapshot.mode === 'markdown' ? 'markdown' : snapshot.language
    void loadLanguage(id).then((ext) => alive && setLang(ext))
    return () => {
      alive = false
    }
  }, [snapshot])

  const extensions = useMemo(
    () => [
      EditorView.editable.of(false),
      EditorView.contentAttributes.of({ 'aria-label': 'Shared note', 'aria-readonly': 'true' }),
      ...(lineWrap ? [EditorView.lineWrapping] : []),
      ...(lang ? [lang, calmSyntax] : []),
    ],
    [lang, lineWrap],
  )

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-border bg-accent-soft px-4 py-2.5 pt-[max(10px,env(safe-area-inset-top))] text-[12.5px] max-sm:gap-2">
        <Lock size={13} className="text-accent" />
        <span
          data-banner
          className="min-w-0 flex-1 truncate text-fg max-sm:basis-full max-sm:whitespace-normal"
        >
          <b className="font-semibold">Shared note</b> · {title} ·{' '}
          {expired ? (
            <span className="text-warn">This link has expired · you can still save your copy</span>
          ) : (
            <span className="tabular-nums">expires in {label}</span>
          )}
        </span>
        {snapshot.mode === 'markdown' && (
          <button type="button" className={button} onClick={() => setPreview((p) => !p)}>
            {preview ? 'Show source' : 'Preview'}
          </button>
        )}
        <button type="button" className={button} onClick={() => onDownload(noteExportFile(note))}>
          <Download size={13} /> Download
        </button>
        <button
          type="button"
          className={primary}
          onClick={() =>
            onSave({
              title: `${title} (shared)`,
              content: snapshot.content,
              language: snapshot.language,
              mode: snapshot.mode,
            })
          }
        >
          <Save size={13} /> Save to my notes
        </button>
        <button
          type="button"
          aria-label="Close"
          title="Close"
          className={button + ' px-2'}
          onClick={onClose}
        >
          <X size={14} />
        </button>
      </header>
      <main className="min-h-0 flex-1 overflow-auto">
        {preview ? (
          <Suspense fallback={null}>
            <MarkdownPreview source={snapshot.content} />
          </Suspense>
        ) : (
          <CodeMirror
            value={snapshot.content}
            editable={false}
            basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: false }}
            theme={calmEditorTheme}
            extensions={extensions}
            height="100%"
          />
        )}
      </main>
    </div>
  )
}

const CONNECTING: ReceiveState = { s: 'connecting' }

/** Observable slot for the current receiver (swapped on mount/unmount). */
function receiverHolder() {
  const listeners = new Set<() => void>()
  let unsubscribe = () => {}
  const holder = {
    current: null as Receiver | null,
    set(r: Receiver | null) {
      unsubscribe()
      holder.current = r
      unsubscribe = r ? r.subscribe(() => listeners.forEach((cb) => cb())) : () => {}
      listeners.forEach((cb) => cb())
    },
    subscribe(cb: () => void) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    snapshot: (): ReceiveState => holder.current?.state() ?? CONNECTING,
  }
  return holder
}

export function ShareView({ parts, transport, onSave, onClose, onDownload }: Props) {
  // One receiver per mount, created in the effect so StrictMode's remount gets a fresh one.
  const holder = useMemo(() => receiverHolder(), [])
  useEffect(() => {
    const r = createReceiver({ parts, transport })
    holder.set(r)
    return () => {
      r.dispose()
      holder.set(null)
    }
  }, [holder, parts, transport])
  const state: ReceiveState = useSyncExternalStore(holder.subscribe, holder.snapshot)
  const receiver = {
    submitPassword: (pw: string) => holder.current?.submitPassword(pw),
    retry: () => holder.current?.retry(),
  }
  const [wrong, setWrong] = useState(false)
  const expiresAt = parts.exp * 1000
  const left = useCountdown(expiresAt)
  const close = (
    <button type="button" className={button + ' mx-auto'} onClick={onClose}>
      Go to my notes
    </button>
  )

  switch (state.s) {
    case 'ready':
      return (
        <ReadyView
          snapshot={state.snapshot}
          expiresAt={state.expiresAt}
          onSave={onSave}
          onClose={onClose}
          onDownload={onDownload}
        />
      )
    case 'expired':
      return (
        <Card icon={<Clock size={18} />} title="This shared note has expired">
          <p>Ask the sender for a new link.</p>
          {close}
        </Card>
      )
    case 'stopped':
      return (
        <Card icon={<X size={18} />} title="The sender stopped sharing this note">
          <p>Ask them for a new link if you still need it.</p>
          {close}
        </Card>
      )
    case 'need-password':
    case 'wrong-password':
    case 'cooldown':
      return (
        <Card icon={<Lock size={18} />} title="This note is password-protected">
          <p className="tabular-nums">Link expires in {left.label}.</p>
          <PasswordForm
            wrong={wrong || state.s === 'wrong-password'}
            cooldownUntil={state.s === 'cooldown' ? state.retryAt : undefined}
            onSubmit={(pw) => {
              setWrong(true)
              receiver.submitPassword(pw)
            }}
          />
        </Card>
      )
    case 'connecting':
      return <Card icon={<Lock size={18} />} title="Opening shared note…" />
    case 'waiting':
      return (
        <Card icon={<WifiOff size={18} />} title="Waiting for the sender to come online…">
          <p>
            The note is sent straight from the sender’s browser, so their Notepadz needs to be open.
          </p>
          <p className="tabular-nums">Link expires in {left.label}.</p>
          {close}
        </Card>
      )
    case 'blocked':
      return (
        <Card icon={<AlertTriangle size={18} />} title="Couldn’t connect to the sender’s browser">
          <p>
            Some networks block direct connections — try another network (e.g. a phone hotspot).
          </p>
          <button type="button" className={primary + ' mx-auto'} onClick={() => receiver.retry()}>
            Try again
          </button>
        </Card>
      )
    case 'unavailable':
      return (
        <Card icon={<AlertTriangle size={18} />} title="Couldn’t reach the sharing service">
          <p>Check your connection and try again.</p>
          <button type="button" className={primary + ' mx-auto'} onClick={() => receiver.retry()}>
            Try again
          </button>
        </Card>
      )
    case 'corrupt':
      return (
        <Card icon={<AlertTriangle size={18} />} title="Couldn’t open this note">
          <p>The transfer was damaged. Try again.</p>
          <button type="button" className={primary + ' mx-auto'} onClick={() => receiver.retry()}>
            Try again
          </button>
        </Card>
      )
  }
}
