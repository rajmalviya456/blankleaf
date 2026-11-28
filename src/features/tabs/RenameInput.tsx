import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { composing } from '../../lib/ime'

interface Props {
  initial: string
  onCommit(value: string): void
  onCancel(): void
  /** After Enter or Escape (not a click away), so focus can go back where it came from. */
  onKeyboardDone?(): void
  /**
   * Float the input over this element instead of rendering it in place. A tab list may
   * contain only tabs, so the desktop tab bar shows its rename box on top of the tab.
   */
  anchor?: HTMLElement | null
}

/** Input used to rename a tab. Enter/blur commits, Escape cancels. */
export function RenameInput({ initial, onCommit, onCancel, onKeyboardDone, anchor }: Props) {
  const [value, setValue] = useState(initial)
  // Measured once: the tab doesn't move while its rename box is open.
  const [rect] = useState(() => anchor?.getBoundingClientRect() ?? null)
  const done = useRef(false)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])

  const finish = (commit: boolean) => {
    if (done.current) return
    done.current = true
    if (commit) onCommit(value)
    else onCancel()
  }

  const input = (
    <input
      ref={ref}
      aria-label="Rename note"
      value={value}
      size={Math.max(8, Math.min(value.length + 1, 40))}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => finish(true)}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (composing(e)) return
        if (e.key === 'Enter' || e.key === 'Escape') {
          finish(e.key === 'Enter')
          onKeyboardDone?.()
        }
      }}
      onPointerDown={(e) => e.stopPropagation()}
      style={
        rect
          ? {
              position: 'fixed',
              left: rect.left,
              top: rect.top,
              height: rect.height,
              minWidth: rect.width,
            }
          : undefined
      }
      className={
        'min-w-0 rounded-sm border border-accent bg-bg-sunken px-1 text-fg outline-none' +
        (rect ? ' z-50 text-[12.5px]' : '')
      }
    />
  )
  if (!anchor) return input
  // Inside the tab bar's landmark (not loose in <body>), so it stays in the page's regions.
  return rect ? createPortal(input, anchor.closest('header') ?? document.body) : null
}
