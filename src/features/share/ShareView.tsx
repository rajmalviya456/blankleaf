import { noIndex } from '../../lib/noIndex'
/**
 * Recipient page for a share link (spec §5.3). Deliberately lightweight: it doesn't open the
 * notes database or touch the recipient's notes. Save/Close hand over to the full app.
 */
import { EditorView, lineNumbers } from '@codemirror/view'
import CodeMirror from '@uiw/react-codemirror'
import { AlertTriangle, Clock, Download, Lock, Save, Unlink, WifiOff, X } from 'lucide-react'
import {
  Fragment,
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
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
import { ShareErrorBoundary } from './ShareErrorBoundary'
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
  /** The share is over (expired, or the sender stopped it): nothing more can come from it. */
  onEnded?(): void
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

/**
 * Holds back a phone's pull-to-refresh while the share page is up: a reload comes back to the
 * share page, but the note has to come from the sender again. Set on <html>, the page's
 * scroller, as nothing else stops it. Returns a function that puts the previous value back.
 */
function holdBackPullToRefresh(): () => void {
  const style = document.documentElement.style
  const previous = style.getPropertyValue('overscroll-behavior-y')
  style.setProperty('overscroll-behavior-y', 'contain')
  return () => {
    if (previous) style.setProperty('overscroll-behavior-y', previous)
    else style.removeProperty('overscroll-behavior-y')
  }
}

// A heading that takes focus is a place to read from, not a control: no focus ring. (`!` beats
// the global one, which browsers would otherwise draw around the title on every page load.)
const FOCUS_TARGET = 'outline-none!'

/**
 * Each step of the page replaces the last one, taking the button that was pressed with it, and
 * focus would fall back to the empty page. Bring it to the new step's heading instead, unless
 * something in the step took it already (the password field).
 */
function useTakeLostFocus(target: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const active = document.activeElement
    if (!active || active === document.body || !active.isConnected) target.current?.focus()
  }, [target])
}

function Card({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  const heading = useRef<HTMLHeadingElement>(null)
  useTakeLostFocus(heading)
  return (
    <div className="mx-auto mt-[14vh] w-[min(420px,calc(100vw-32px))] rounded-xl border border-border bg-bg-elev p-6 text-center shadow-xl">
      <div className="mx-auto mb-3 grid size-10 place-items-center rounded-full bg-accent-soft text-accent">
        {icon}
      </div>
      <h1
        ref={heading}
        tabIndex={-1}
        className={`text-[15px] font-semibold text-fg ${FOCUS_TARGET}`}
      >
        {title}
      </h1>
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
  // Read out with the field, so the reason is heard where the next try is typed.
  const message = blocked ? 'share-password-wait' : wrong ? 'share-password-wrong' : undefined
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
        aria-describedby={message}
        className="h-9 w-full rounded-md border border-border bg-bg px-3 text-[13px] text-fg outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)] aria-[invalid=true]:border-danger"
      />
      {wrong && !blocked && (
        <p id="share-password-wrong" role="alert" className="text-[12px] text-danger">
          Wrong password. Try again.
        </p>
      )}
      {/* Not a live region: the countdown in it changes every second. */}
      {blocked && (
        <p id="share-password-wait" className="text-[12px] text-warn">
          Too many wrong attempts. Try again in {wait.label}.
        </p>
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

/** The note as plain text, for when the viewer itself failed: the words still reach the reader. */
function PlainText({ text }: { text: string }) {
  return (
    <div className="space-y-3 p-4">
      <p className="text-[12.5px] text-fg-muted">
        This note couldn’t be shown formatted. Here is its text.
      </p>
      <pre className="font-mono text-[13px] leading-relaxed break-words whitespace-pre-wrap text-fg">
        {text}
      </pre>
    </div>
  )
}

function ReadyView({
  snapshot,
  expiresAt,
  onSave,
  onClose,
  onDownload,
}: { snapshot: Snapshot; expiresAt: number } & Pick<Props, 'onSave' | 'onClose' | 'onDownload'>) {
  const { label, expired } = useCountdown(expiresAt)
  const note = useMemo(() => asNote(snapshot), [snapshot])
  const title = displayTitle(note)
  const [lang, setLang] = useState<import('@codemirror/state').Extension | null>(null)
  const [preview, setPreview] = useState(snapshot.mode === 'markdown')
  const heading = useRef<HTMLHeadingElement>(null)
  useTakeLostFocus(heading)
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
      lineNumbers(),
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
        <div
          data-banner
          className="min-w-0 flex-1 truncate text-fg max-sm:basis-full max-sm:whitespace-normal"
        >
          {/* The page's heading, inline in the banner: where focus goes when the note opens. */}
          <h1 ref={heading} tabIndex={-1} className={`inline ${FOCUS_TARGET}`}>
            <b className="font-semibold">Shared note</b> · {title}
          </h1>{' '}
          ·{' '}
          {expired ? (
            <span className="text-warn">This link has expired · you can still save your copy</span>
          ) : (
            <span className="tabular-nums">expires in {label}</span>
          )}
        </div>
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
        {/* Keyed so "Show source" / "Preview" get a fresh try after a failure. */}
        <ShareErrorBoundary
          key={preview ? 'preview' : 'source'}
          fallback={<PlainText text={snapshot.content} />}
        >
          {preview ? (
            <Suspense fallback={null}>
              <MarkdownPreview source={snapshot.content} remoteImages={false} />
            </Suspense>
          ) : (
            <CodeMirror
              value={snapshot.content}
              editable={false}
              basicSetup={false}
              theme={calmEditorTheme}
              extensions={extensions}
              height="100%"
            />
          )}
        </ShareErrorBoundary>
      </main>
    </div>
  )
}

/** A share link that was cut short (or mangled) on its way: there's nothing to connect to. */
export function BrokenShareLink({ onClose }: { onClose(): void }) {
  useEffect(() => noIndex(), [])
  return (
    <Card icon={<Unlink size={18} />} title="This share link is incomplete">
      <p>Copy the whole link from the message you got, then open it again.</p>
      <button type="button" className={button + ' mx-auto'} onClick={onClose}>
        Go to my notes
      </button>
    </Card>
  )
}

/** When the share page itself failed: a reload comes back to it (the link waits in the tab). */
export function ShareFailed({ onClose }: { onClose(): void }) {
  return (
    <Card icon={<AlertTriangle size={18} />} title="Couldn’t show this shared note">
      <p>Reload the page to try again.</p>
      <div className="flex justify-center gap-2">
        <button type="button" className={primary} onClick={() => location.reload()}>
          Reload
        </button>
        <button type="button" className={button} onClick={onClose}>
          Go to my notes
        </button>
      </div>
    </Card>
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

/** Each step's heading, which is also what screen readers hear when the page moves to it. */
const HEADINGS: Record<Exclude<ReceiveState['s'], 'ready'>, string> = {
  expired: 'This shared note has expired',
  stopped: 'The sender stopped sharing this note',
  'need-password': 'This note is password-protected',
  'wrong-password': 'This note is password-protected',
  cooldown: 'This note is password-protected',
  connecting: 'Opening shared note…',
  waiting: 'Waiting for the sender to come online…',
  blocked: 'Couldn’t connect to the sender’s browser',
  unavailable: 'Couldn’t reach the sharing service',
  corrupt: 'Couldn’t open this note',
}

export function ShareView({ parts, transport, onSave, onClose, onDownload, onEnded }: Props) {
  // A shared note must never end up in search results, even if its link is posted publicly.
  useEffect(() => noIndex(), [])
  useEffect(() => holdBackPullToRefresh(), [])
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
  const ended = state.s === 'expired' || state.s === 'stopped'
  useEffect(() => {
    if (ended) onEnded?.()
  }, [ended, onEnded])
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
  // Each state gets a fresh card (its heading takes the focus); the password states share one.
  const step = state.s === 'wrong-password' || state.s === 'cooldown' ? 'need-password' : state.s
  // The page changes without loading: a status message tells screen readers where it is now.
  const page = (content: ReactNode) => (
    <>
      <p role="status" className="sr-only">
        {state.s === 'ready' ? 'Shared note opened' : HEADINGS[state.s]}
      </p>
      <Fragment key={step}>{content}</Fragment>
    </>
  )

  switch (state.s) {
    case 'ready':
      return page(
        <ReadyView
          snapshot={state.snapshot}
          expiresAt={state.expiresAt}
          onSave={onSave}
          onClose={onClose}
          onDownload={onDownload}
        />,
      )
    case 'expired':
      return page(
        <Card icon={<Clock size={18} />} title={HEADINGS[state.s]}>
          <p>Ask the sender for a new link.</p>
          {close}
        </Card>,
      )
    case 'stopped':
      return page(
        <Card icon={<X size={18} />} title={HEADINGS[state.s]}>
          <p>Ask them for a new link if you still need it.</p>
          {close}
        </Card>,
      )
    case 'need-password':
    case 'wrong-password':
    case 'cooldown':
      return page(
        <Card icon={<Lock size={18} />} title={HEADINGS[state.s]}>
          <p className="tabular-nums">Link expires in {left.label}.</p>
          <PasswordForm
            wrong={wrong || state.s === 'wrong-password'}
            cooldownUntil={state.s === 'cooldown' ? state.retryAt : undefined}
            onSubmit={(pw) => {
              setWrong(true)
              receiver.submitPassword(pw)
            }}
          />
        </Card>,
      )
    case 'connecting':
      return page(<Card icon={<Lock size={18} />} title={HEADINGS[state.s]} />)
    case 'waiting':
      return page(
        <Card icon={<WifiOff size={18} />} title={HEADINGS[state.s]}>
          <p>
            The note is sent straight from the sender’s browser, so their Blankleaf needs to be
            open.
          </p>
          <p className="tabular-nums">Link expires in {left.label}.</p>
          {close}
        </Card>,
      )
    case 'blocked':
      return page(
        <Card icon={<AlertTriangle size={18} />} title={HEADINGS[state.s]}>
          <p>
            Some networks block direct connections — try another network (e.g. a phone hotspot).
          </p>
          <button type="button" className={primary + ' mx-auto'} onClick={() => receiver.retry()}>
            Try again
          </button>
        </Card>,
      )
    case 'unavailable':
      return page(
        <Card icon={<AlertTriangle size={18} />} title={HEADINGS[state.s]}>
          <p>Check your connection and try again.</p>
          <button type="button" className={primary + ' mx-auto'} onClick={() => receiver.retry()}>
            Try again
          </button>
        </Card>,
      )
    case 'corrupt':
      return page(
        <Card icon={<AlertTriangle size={18} />} title={HEADINGS[state.s]}>
          <p>The transfer was damaged. Try again.</p>
          <button type="button" className={primary + ' mx-auto'} onClick={() => receiver.retry()}>
            Try again
          </button>
        </Card>,
      )
  }
}
