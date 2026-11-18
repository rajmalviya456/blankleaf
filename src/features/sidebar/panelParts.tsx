import type { ReactNode } from 'react'

export function PanelHeader({
  title,
  count,
  action,
}: {
  title: string
  count?: number
  action?: ReactNode
}) {
  return (
    <div className="flex h-9 shrink-0 items-center gap-2 px-3 max-sm:h-12 max-sm:pr-1">
      <h2 className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-fg-faint">
        {title}
        {count !== undefined && <span className="ml-1.5 font-normal tabular-nums">{count}</span>}
      </h2>
      {action}
    </div>
  )
}
