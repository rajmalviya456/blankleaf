import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronDown, Pin } from 'lucide-react'
import { displayTitle } from '../../domain/title'
import type { Note } from '../../domain/types'
import { getStore } from '../../store/store'

/** "⌄" menu listing every open tab — useful when the strip overflows. */
export function TabOverflowMenu({ tabs, activeId }: { tabs: Note[]; activeId: string | null }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label="All open tabs"
        title="All open tabs"
        className="grid size-7 place-items-center rounded-md text-fg-muted outline-none hover:bg-bg-hover hover:text-fg"
      >
        <ChevronDown size={15} strokeWidth={1.75} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 max-h-[60vh] min-w-56 overflow-y-auto rounded-md border border-border bg-bg-elev p-1 shadow-lg"
        >
          {tabs.map((n) => (
            <DropdownMenu.Item
              key={n.id}
              onSelect={() => getStore().getState().setActive(n.id)}
              className={[
                'flex cursor-default select-none items-center gap-2 rounded px-2 py-1.5 text-[12.5px] outline-none data-[highlighted]:bg-accent-soft',
                n.id === activeId ? 'text-accent' : 'text-fg',
              ].join(' ')}
            >
              {n.pinned && <Pin size={11} className="text-warn" />}
              <span className="truncate">{displayTitle(n)}</span>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
