import * as Popover from '@radix-ui/react-popover'
import { Share2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { ShareRow } from '../../db/db'
import { toast } from '../../ui/toast'
import { useCountdown } from './countdown'
import { useActiveShares } from './useActiveShares'
import { ActiveSharesList } from './ActiveSharesList'

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
          <ActiveSharesList shares={shares} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
