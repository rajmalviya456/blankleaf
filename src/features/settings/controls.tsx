import * as Switch from '@radix-ui/react-switch'
import { useId, type ReactNode } from 'react'

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1">
      <h3 className="pb-1 text-[11px] font-semibold uppercase tracking-wider text-fg-faint">
        {title}
      </h3>
      <div className="divide-y divide-border rounded-lg border border-border bg-bg">{children}</div>
    </section>
  )
}

export function Row({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string
  hint?: string
  children: ReactNode
  htmlFor?: string
}) {
  return (
    <div className="flex min-h-11 items-center gap-4 px-3 py-2">
      <div className="min-w-0 flex-1">
        <label htmlFor={htmlFor} className="text-[12.5px] text-fg">
          {label}
        </label>
        {hint && <p className="text-[11px] leading-snug text-fg-faint">{hint}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  )
}

export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange(v: T): void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-md bg-bg-sunken p-0.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={[
            'rounded px-2.5 py-1 text-[12px] outline-none focus-visible:ring-1 focus-visible:ring-accent',
            o.value === value ? 'bg-bg-elev text-fg shadow-sm' : 'text-fg-muted hover:text-fg',
          ].join(' ')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange(v: boolean): void
}) {
  return (
    <Switch.Root
      aria-label={label}
      checked={checked}
      onCheckedChange={onChange}
      className="relative h-5 w-9 rounded-full bg-bg-hover outline-none transition-colors focus-visible:ring-1 focus-visible:ring-accent data-[state=checked]:bg-accent"
    >
      <Switch.Thumb className="block size-4 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[18px]" />
    </Switch.Root>
  )
}

export function SelectBox<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange(v: T): void
}) {
  const id = useId()
  return (
    <select
      id={id}
      aria-label={label}
      value={String(value)}
      onChange={(e) => {
        const raw = e.target.value
        const match = options.find((o) => String(o.value) === raw)
        if (match) onChange(match.value)
      }}
      className="rounded-md border border-border bg-bg-sunken px-2 py-1 text-[12px] text-fg outline-none focus-visible:ring-1 focus-visible:ring-accent"
    >
      {options.map((o) => (
        <option key={String(o.value)} value={String(o.value)}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export const buttonClass =
  'rounded-md border border-border bg-bg-elev px-2.5 py-1 text-[12px] text-fg hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-50'
