import * as Dialog from '@radix-ui/react-dialog'
import * as Switch from '@radix-ui/react-switch'
import { Check, Copy, Loader, RefreshCw, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useStore } from 'zustand'
import { displayTitle } from '../../domain/title'
import { formatBytes } from '../../lib/storageInfo'
import { useAppStore } from '../../store/store'
import { useCountdown } from './countdown'
import { packSnapshot } from './crypto'
import { MAX_SNAPSHOT_BYTES, type CreatedShare } from './host'
import { generatePassword, isPasswordValid } from './password'
import { getShareHost, shareStore } from './shareStore'

const EXPIRIES = [
  { label: '5 min', ms: 5 * 60_000 },
  { label: '1 hour', ms: 60 * 60_000 },
  { label: '1 day', ms: 24 * 60 * 60_000 },
  { label: '7 days', ms: 7 * 24 * 60 * 60_000 },
]

const field =
  'h-8 min-w-0 flex-1 rounded-md border border-border bg-bg-sunken px-2.5 font-mono text-[12px] text-fg outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]'
const ghost =
  'flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 text-[12px] text-fg hover:bg-bg-hover'

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** Start a clipboard write now with text that arrives later (ClipboardItem with a promise). */
function copyLater(text: Promise<string>): Promise<boolean> {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write)
    return Promise.resolve(false)
  try {
    const item = new ClipboardItem({
      'text/plain': text.then((t) => new Blob([t], { type: 'text/plain' })),
    })
    return navigator.clipboard.write([item]).then(
      () => true,
      () => false,
    )
  } catch {
    return Promise.resolve(false)
  }
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      className={ghost}
      onClick={async () => {
        if (await copy(text)) {
          setDone(true)
          setTimeout(() => setDone(false), 1500)
        }
      }}
    >
      {done ? <Check size={12} className="text-ok" /> : <Copy size={12} />}
      {label}
    </button>
  )
}

function Created({
  share,
  createdAt,
  copied,
}: {
  share: CreatedShare
  createdAt: number
  copied: boolean
}) {
  const { msLeft, label } = useCountdown(share.expiresAt)
  const total = Math.max(1, share.expiresAt - createdAt)
  const pct = Math.max(0, Math.min(100, (msLeft / total) * 100))
  const close = () => shareStore.getState().close()
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          aria-label="Link"
          readOnly
          value={share.link}
          className={field}
          onFocus={(e) => e.target.select()}
        />
        <CopyButton text={share.link} label="Copy link" />
      </div>
      {share.password && (
        <div className="flex gap-2">
          <input
            aria-label="Password"
            readOnly
            value={share.password}
            className={field}
            onFocus={(e) => e.target.select()}
          />
          <CopyButton text={share.password} label="Copy password" />
        </div>
      )}
      <div className="flex items-center gap-2 text-[12px]">
        {copied ? (
          <span className="flex items-center gap-1 text-ok">
            <Check size={12} /> Message copied
          </span>
        ) : (
          <span className="text-warn">Couldn’t copy automatically — use the buttons</span>
        )}
        <span className="ml-auto tabular-nums text-fg-muted">
          Expires in <b className="text-fg">{label}</b>
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-bg-hover">
        <div
          role="progressbar"
          aria-label="Time left"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-full rounded-full bg-accent transition-[width] duration-1000 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
      {share.password && (
        <p className="text-[11.5px] leading-snug text-fg-muted">
          For confidential notes, send the password another way (a call or a different app). Sent
          together, it only protects against someone seeing just the link.
        </p>
      )}
      <p className="text-[11.5px] leading-snug text-fg-muted">
        Keep Notepadz open until they’ve opened it — the note is sent straight from this browser.
      </p>
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={async () => {
            await getShareHost()?.stop(share.id)
            close()
          }}
          className="h-8 rounded-md border border-border px-3 text-[12px] text-danger hover:bg-bg-hover"
        >
          Stop sharing
        </button>
        <button
          type="button"
          onClick={close}
          className="ml-auto h-8 rounded-md bg-accent px-4 text-[12px] font-medium text-accent-fg"
        >
          Done
        </button>
      </div>
    </div>
  )
}

function Options({ noteId }: { noteId: string }) {
  const note = useAppStore((s) => s.notes[noteId])
  const [expiry, setExpiry] = useState(EXPIRIES[0].ms)
  const [protect, setProtect] = useState(true)
  const [password, setPassword] = useState(() => generatePassword())
  const [size, setSize] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{
    share: CreatedShare
    at: number
    copied: boolean
  } | null>(null)

  useEffect(() => {
    let alive = true
    if (note) void packSnapshot(note).then((b) => alive && setSize(b.length))
    return () => {
      alive = false
    }
  }, [note])

  if (!note) return null
  if (created)
    return <Created share={created.share} createdAt={created.at} copied={created.copied} />

  const tooBig = size !== null && size > MAX_SNAPSHOT_BYTES
  const canCreate = !busy && !tooBig && (!protect || isPasswordValid(password))

  const create = async () => {
    const host = getShareHost()
    if (!host) return
    setBusy(true)
    setError(null)
    const at = Date.now()
    const sharing = host.create(note, { expiresInMs: expiry, password: protect ? password : null })
    // Safari only allows clipboard writes during the click itself, but the link takes a few
    // seconds; hand the clipboard a promise of the message now (falls back to writeText).
    const message = sharing.then((sh) => sh.message)
    message.catch(() => {}) // failure is reported below; don't leave this branch unhandled
    const viaPromise = copyLater(message)
    try {
      const share = await sharing
      const copied = (await viaPromise) || (await copy(share.message))
      setCreated({ share, at, copied })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t create the link.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-faint">
          Link expires after
        </div>
        <div
          role="radiogroup"
          aria-label="Link expires after"
          className="flex rounded-md bg-bg-sunken p-0.5"
        >
          {EXPIRIES.map((e) => (
            <button
              key={e.ms}
              type="button"
              role="radio"
              aria-checked={expiry === e.ms}
              onClick={() => setExpiry(e.ms)}
              className={[
                'flex-1 rounded py-1.5 text-[12px]',
                expiry === e.ms ? 'bg-bg-elev text-fg shadow-sm' : 'text-fg-muted hover:text-fg',
              ].join(' ')}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[12.5px] text-fg">Protect with password</div>
            <div className="text-[11.5px] text-fg-muted">
              Recommended — a leaked link alone can’t be opened
            </div>
          </div>
          <Switch.Root
            aria-label="Protect with password"
            checked={protect}
            onCheckedChange={setProtect}
            className="relative h-5 w-9 shrink-0 rounded-full bg-bg-hover transition-colors data-[state=checked]:bg-accent"
          >
            <Switch.Thumb className="block size-4 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[18px]" />
          </Switch.Root>
        </div>
        {protect && (
          <div className="flex gap-2">
            <input
              aria-label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              spellCheck={false}
              autoComplete="off"
              className={field}
            />
            <button
              type="button"
              aria-label="New password"
              title="New password"
              onClick={() => setPassword(generatePassword())}
              className={ghost}
            >
              <RefreshCw size={13} />
            </button>
          </div>
        )}
        {protect && !isPasswordValid(password) && (
          <p className="text-[11.5px] text-danger">Use at least 8 characters.</p>
        )}
      </div>

      <p className="text-[11.5px] leading-snug text-fg-muted">
        Encrypted in your browser and sent straight to the person who opens the link — no server
        stores it. Anyone with the link{protect ? ' and password' : ''} can read it until it
        expires.
      </p>

      {error && (
        <p role="alert" className="text-[12px] text-danger">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <span className={`text-[11.5px] ${tooBig ? 'text-danger' : 'text-fg-faint'}`}>
          {size === null ? 'Measuring…' : `Size: ${formatBytes(size)} of 5 MB`}
          {tooBig && ' — too large to share'}
        </span>
        <button
          type="button"
          disabled={!canCreate}
          onClick={() => void create()}
          className="ml-auto flex h-8 items-center gap-1.5 rounded-md bg-accent px-4 text-[12px] font-medium text-accent-fg disabled:opacity-40"
        >
          {busy && <Loader size={12} className="animate-spin" />}
          {busy ? 'Creating link…' : 'Create link'}
        </button>
      </div>
    </div>
  )
}

/** "Share note" popup (spec §5.1). */
export function ShareDialog() {
  const noteId = useStore(shareStore, (s) => s.dialogNoteId)
  const title = useAppStore((s) => (noteId && s.notes[noteId] ? displayTitle(s.notes[noteId]) : ''))
  const host = getShareHost()
  return (
    <Dialog.Root open={noteId !== null} onOpenChange={(o) => !o && shareStore.getState().close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="np-overlay fixed inset-0 z-40" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[14vh] z-50 w-[min(420px,calc(100vw-32px))] -translate-x-1/2 rounded-xl border border-border bg-bg-elev shadow-2xl outline-none"
        >
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <Dialog.Title className="truncate pr-4 text-sm font-medium text-fg">
              Share “{title}”
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="grid size-7 place-items-center rounded-md text-fg-muted hover:bg-bg-hover hover:text-fg"
            >
              <X size={15} />
            </Dialog.Close>
          </header>
          <div className="p-4">
            {!host ? (
              <p className="text-[12.5px] text-fg-muted">
                Sharing needs browser storage, which isn’t available in this window (for example in
                some private modes).
              </p>
            ) : (
              noteId && <Options key={noteId} noteId={noteId} />
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
