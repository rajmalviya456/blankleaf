import * as Select from '@radix-ui/react-select'
import * as Switch from '@radix-ui/react-switch'
import { Check, ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'

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
  return (
    <Select.Root
      value={String(value)}
      onValueChange={(raw) => {
        const match = options.find((o) => String(o.value) === raw)
        if (match) onChange(match.value)
      }}
    >
      <Select.Trigger
        aria-label={label}
        className="flex h-7 w-36 items-center justify-between gap-2 rounded-md border border-border bg-bg-sunken pl-2.5 pr-2 text-[12px] text-fg outline-none hover:border-fg-faint focus-visible:ring-1 focus-visible:ring-accent data-[state=open]:border-accent"
      >
        <Select.Value />
        <Select.Icon className="text-fg-faint">
          <ChevronDown size={13} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          side="bottom"
          align="end"
          sideOffset={4}
          className="z-[60] w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-border bg-bg-elev p-1 shadow-lg"
        >
          <Select.Viewport>
            {options.map((o) => (
              <Select.Item
                key={String(o.value)}
                value={String(o.value)}
                className="relative flex h-7 cursor-default select-none items-center rounded pl-7 pr-2 text-[12px] text-fg outline-none data-[highlighted]:bg-accent-soft"
              >
                <Select.ItemIndicator className="absolute left-2 text-accent">
                  <Check size={12} />
                </Select.ItemIndicator>
                <Select.ItemText>{o.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}

export const buttonClass =
  'rounded-md border border-border bg-bg-elev px-2.5 py-1 text-[12px] text-fg hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-50'
