import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import type { ShareRow } from '../../db/db'
import { toast } from '../../ui/toast'
import { useCountdown } from './countdown'
import { getShareHost } from './shareStore'

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

/** Every active share with its live countdown, copy and stop buttons (popover and phone sheet). */
export function ActiveSharesList({ shares }: { shares: ShareRow[] }) {
  return (
    <>
      <ul className="max-h-80 divide-y divide-border overflow-y-auto">
        {shares.map((r) => (
          <ShareItem key={r.id} row={r} />
        ))}
      </ul>
      <p className="border-t border-border px-3 py-2 text-[11px] leading-snug text-fg-faint">
        Keep Blankleaf open until each link is opened — notes are sent from this browser.
      </p>
    </>
  )
}
