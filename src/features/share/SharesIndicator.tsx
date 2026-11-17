import * as Popover from '@radix-ui/react-popover'
import { Check, Copy, Share2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ShareRow } from '../../db/db'
import { toast } from '../../ui/toast'
import { useCountdown } from './countdown'
import { getShareHost } from './shareStore'
import { useActiveShares } from './useActiveShares'

const timeOf = (ts: number) =>
  new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

function ShareItem({ row }: { row: ShareRow }) {
  const { msLeft, label } = useCountdown(row.expiresAt)
  const pct = Math.max(
    0,
    Math.min(100, (msLeft / Math.max(1, row.expiresAt - row.createdAt)) * 100),
  )
  const [copied, setCopied] = useState(false)
  const host = getShareHost()
  return (
    <li className="space-y-1.5 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-fg">
          {row.title || 'Untitled'}
        </span>
        <span className="shrink-0 text-[11.5px] tabular-nums text-fg-muted">{label} left</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-bg-hover">
        <div
          role="progressbar"
          aria-label={`Time left for ${row.title || 'Untitled'}`}
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-full rounded-full bg-accent transition-[width] duration-1000 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-[11px] text-fg-muted">
        {row.opens
          ? `Opened ${row.opens} time${row.opens === 1 ? '' : 's'}${row.lastOpenedAt ? ` · last at ${timeOf(row.lastOpenedAt)}` : ''}`
          : 'Not opened yet'}
        {row.password ? ' · password protected' : ''}
      </div>
      <div className="flex items-center justify-end gap-1 text-[11px]">
        <button
          type="button"
          onClick={async () => {
            if (!host) return
            try {
              await navigator.clipboard.writeText(host.messageFor(row))
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            } catch {
              toast('Couldn’t copy — open the share again to copy the link.', { tone: 'warn' })
            }
          }}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-fg-muted hover:bg-bg-hover hover:text-fg"
        >
          {copied ? <Check size={11} className="text-ok" /> : <Copy size={11} />}
          Copy message
        </button>
        <button
          type="button"
          onClick={() => void host?.stop(row.id)}
          className="rounded px-1.5 py-0.5 text-danger hover:bg-bg-hover"
        >
          Stop sharing
        </button>
      </div>
    </li>
  )
}

/** Status-bar "Sharing N notes" indicator with a popover of every active share (spec §5.2). */
export function SharesIndicator() {
  const shares = useActiveShares()
  const soonest = shares[0]
  const { label } = useCountdown(soonest?.expiresAt ?? 0)
  const previous = useRef<ShareRow[]>(shares)

  // A share that disappears has ended (expired or stopped, here or in another window).
  useEffect(() => {
    const now = new Set(shares.map((r) => r.id))
    const ended = previous.current.filter((r) => !now.has(r.id))
    if (ended.length)
      toast(
        ended.length === 1
          ? `Share ended: “${ended[0].title || 'Untitled'}”`
          : `${ended.length} shares ended`,
      )
    previous.current = shares
  }, [shares])

  if (!soonest) return null
  const text =
    shares.length === 1
      ? `Sharing 1 note · ${label} left`
      : `Sharing ${shares.length} notes · next ends in ${label}`

  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={text}
        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-accent tabular-nums hover:bg-bg-hover"
      >
        <Share2 size={11} />
        {text}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="end"
          sideOffset={6}
          aria-label="Active shares"
          role="dialog"
          className="z-50 w-80 overflow-hidden rounded-lg border border-border bg-bg-elev shadow-xl outline-none"
        >
          <div className="border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-fg-faint">
            Active shares
          </div>
          <ul className="max-h-80 divide-y divide-border overflow-y-auto">
            {shares.map((r) => (
              <ShareItem key={r.id} row={r} />
            ))}
          </ul>
          <p className="border-t border-border px-3 py-2 text-[11px] leading-snug text-fg-faint">
            Keep Notepadz open until each link is opened — notes are sent from this browser.
          </p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
