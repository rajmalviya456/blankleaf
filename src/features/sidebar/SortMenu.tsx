import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ArrowUpDown, Check } from 'lucide-react'
import type { NotesSort } from '../../domain/types'
import { getStore, useAppStore } from '../../store/store'

const OPTIONS: { value: NotesSort; label: string }[] = [
  { value: 'edited', label: 'Last edited' },
  { value: 'created', label: 'Date created' },
  { value: 'title', label: 'Name' },
]

/** Chooses the order of the notes list. Pinned notes always stay on top. */
export function SortMenu() {
  const sort = useAppStore((s) => s.settings.notesSort)
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        aria-label="Sort notes"
        title="Sort notes"
        className="grid size-6 place-items-center rounded text-fg-muted outline-none hover:bg-bg-hover hover:text-fg focus-visible:bg-bg-hover max-sm:size-11"
      >
        <ArrowUpDown size={13} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-40 rounded-md border border-border bg-bg-elev p-1 shadow-lg"
        >
          <DropdownMenu.Label className="px-2 py-1 text-[11px] text-fg-faint">
            Sort notes by
          </DropdownMenu.Label>
          <DropdownMenu.RadioGroup
            value={sort}
            onValueChange={(v) =>
              getStore()
                .getState()
                .updateSettings({ notesSort: v as NotesSort })
            }
          >
            {OPTIONS.map((o) => (
              <DropdownMenu.RadioItem
                key={o.value}
                value={o.value}
                className="flex cursor-default select-none items-center gap-2 rounded py-1.5 pl-7 pr-2 text-[12.5px] text-fg outline-none data-[highlighted]:bg-accent-soft max-sm:min-h-11 relative"
              >
                <DropdownMenu.ItemIndicator className="absolute left-2">
                  <Check size={13} />
                </DropdownMenu.ItemIndicator>
                {o.label}
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
