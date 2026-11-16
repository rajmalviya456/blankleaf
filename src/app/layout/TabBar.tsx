import type { ReactNode } from 'react'

/** Placeholder tab strip; replaced by features/tabs in Task 5. */
export function TabBar({ actions }: { actions?: ReactNode }) {
  return (
    <header className="flex h-9 shrink-0 items-end gap-1 bg-bg-sunken px-1.5 pt-1.5">
      <div role="tablist" aria-label="Open notes" className="flex min-w-0 flex-1 items-end gap-0.5">
        <div
          role="tab"
          aria-selected="true"
          className="rounded-t-md bg-bg px-3 py-1.5 text-fg shadow-[inset_0_2px_0_var(--accent)]"
        >
          Untitled
        </div>
      </div>
      <div className="flex items-center gap-0.5 pb-1">{actions}</div>
    </header>
  )
}
