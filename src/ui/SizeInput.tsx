/** Number field for a text size: type a value, Enter or leaving the field applies it (clamped). */
import { useState } from 'react'

interface Props {
  value: number
  min: number
  max: number
  label: string
  onCommit(n: number): void
  className?: string
}

export function SizeInput({ value, min, max, label, onCommit, className = '' }: Props) {
  const [draft, setDraft] = useState<string | null>(null)
  const commit = () => {
    if (draft === null) return
    const n = Math.round(Number(draft))
    setDraft(null)
    if (draft.trim() !== '' && Number.isFinite(n)) onCommit(Math.min(max, Math.max(min, n)))
  }
  return (
    <input
      type="number"
      inputMode="numeric"
      aria-label={label}
      title={`${label} (${min}–${max})`}
      min={min}
      max={max}
      step={1}
      value={draft ?? value}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          commit()
        } else if (e.key === 'Escape') {
          setDraft(null)
        }
      }}
      className={
        'rounded border border-transparent bg-transparent text-center tabular-nums text-fg-muted outline-none [appearance:textfield] hover:border-border focus:border-accent focus:text-fg [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ' +
        className
      }
    />
  )
}
