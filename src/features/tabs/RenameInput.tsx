import { useEffect, useRef, useState } from 'react'

interface Props {
  initial: string
  onCommit(value: string): void
  onCancel(): void
}

/** Inline input used to rename a tab. Enter/blur commits, Escape cancels. */
export function RenameInput({ initial, onCommit, onCancel }: Props) {
  const [value, setValue] = useState(initial)
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

  return (
    <input
      ref={ref}
      aria-label="Rename note"
      value={value}
      size={Math.max(8, Math.min(value.length + 1, 40))}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => finish(true)}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Enter') finish(true)
        else if (e.key === 'Escape') finish(false)
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className="min-w-0 rounded-sm bg-bg-sunken px-1 text-fg outline-none ring-1 ring-accent"
    />
  )
}
