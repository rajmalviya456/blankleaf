import * as Dialog from '@radix-ui/react-dialog'
import {
  Bug,
  ExternalLink,
  Code2,
  HardDrive,
  Keyboard,
  Lock,
  Sparkles,
  WifiOff,
  X,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { getStore, useAppStore } from '../../store/store'
import { DialogSurface } from '../../ui/DialogSurface'

const REPO = 'https://github.com/rajmalviya456/blankleaf'

function Logo() {
  return (
    <svg viewBox="0 0 512 512" className="size-12 shrink-0" aria-hidden>
      <rect width="512" height="512" rx="112" fill="#14161c" />
      <g fill="none" stroke="#5fd39a" strokeWidth="40" strokeLinecap="round" strokeLinejoin="round">
        <path d="M136 376C136 236 236 136 376 136C376 276 276 376 136 376Z" />
        <path d="M136 376L300 212" />
      </g>
    </svg>
  )
}

function Fact({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon
  title: string
  children: ReactNode
}) {
  return (
    <li className="flex gap-3">
      <Icon size={15} className="mt-0.5 shrink-0 text-accent" />
      <div>
        <div className="text-[12.5px] font-medium text-fg">{title}</div>
        <div className="text-[12px] leading-snug text-fg-muted">{children}</div>
      </div>
    </li>
  )
}

function LinkRow({
  href,
  icon: Icon,
  children,
}: {
  href: string
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] text-fg hover:bg-bg-hover"
    >
      <Icon size={14} className="text-fg-muted" />
      <span className="flex-1">{children}</span>
      <ExternalLink size={12} className="text-fg-faint" aria-hidden />
    </a>
  )
}

/** "About Blankleaf": what it is, version, how your data is kept, and where to get help. */
export function AboutDialog() {
  const open = useAppStore((s) => s.ui.aboutOpen)
  const s = () => getStore().getState()

  return (
    <Dialog.Root open={open} onOpenChange={(o) => s().setUi({ aboutOpen: o })}>
      <Dialog.Portal>
        <Dialog.Overlay className="np-overlay fixed inset-0 z-40" />
        <DialogSurface
          aria-describedby="about-tagline"
          className="fixed left-1/2 top-[8vh] z-50 max-h-[84vh] w-[min(440px,calc(100vw-32px))] -translate-x-1/2 overflow-y-auto rounded-xl border border-border bg-bg-elev p-5 shadow-2xl outline-none"
        >
          <Dialog.Close
            aria-label="Close"
            className="absolute right-3 top-3 grid size-7 place-items-center rounded-md text-fg-muted hover:bg-bg-hover hover:text-fg"
          >
            <X size={15} />
          </Dialog.Close>

          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <Dialog.Title className="text-[15px] font-semibold text-fg">
                About Blankleaf
              </Dialog.Title>
              <p className="text-[12px] tabular-nums text-fg-muted">
                Version {__APP_VERSION__} · formerly Notepadz
              </p>
            </div>
          </div>
          <p id="about-tagline" className="mt-3 text-[12.5px] leading-snug text-fg-muted">
            A free online notepad: full-window and tabbed, for quick scratch text, code and logs,
            and long-lived notes.
          </p>

          <ul className="mt-4 space-y-3">
            <Fact icon={HardDrive} title="Your notes stay on this device">
              Notes are stored only in this browser — no account, no server, nothing uploaded.
              Clearing site data deletes them, so export a backup now and then (Settings › Data).
            </Fact>
            <Fact icon={WifiOff} title="Works offline">
              Install it from the address bar and it opens like an app, with or without a
              connection.
            </Fact>
            <Fact icon={Lock} title="Sharing is end-to-end encrypted">
              A shared note goes straight from your browser to the recipient’s, encrypted, and the
              link stops working when it expires.
            </Fact>
          </ul>

          <div className="mt-4 border-t border-border pt-3">
            <LinkRow href={REPO} icon={Code2}>
              Source code on GitHub
            </LinkRow>
            <LinkRow href={`${REPO}/issues/new`} icon={Bug}>
              Report a problem or suggest an idea
            </LinkRow>
            <button
              type="button"
              onClick={() => s().setUi({ aboutOpen: false, whatsNewOpen: true })}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] text-fg hover:bg-bg-hover"
            >
              <Sparkles size={14} className="text-fg-muted" />
              What’s new
            </button>
            <button
              type="button"
              onClick={() => s().setUi({ aboutOpen: false, shortcutsOpen: true })}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] text-fg hover:bg-bg-hover"
            >
              <Keyboard size={14} className="text-fg-muted" />
              Keyboard shortcuts
            </button>
          </div>

          <p className="mt-3 text-[11px] leading-snug text-fg-faint">
            Built with React, CodeMirror, Dexie, Radix UI and PeerJS.
          </p>
        </DialogSurface>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
