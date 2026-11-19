import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Link2 } from 'lucide-react'
import { backlinks } from '../../domain/links'
import { displayTitle } from '../../domain/title'
import type { Note } from '../../domain/types'
import { getStore, useAppStore } from '../../store/store'

/** Ids of the notes linking to this one, as one string so the selector only re-renders on change. */
export function useLinkedFrom(noteId: string): Note[] {
  const ids = useAppStore((s) =>
    backlinks(s.notes, noteId)
      .map((n) => n.id)
      .join(' '),
  )
  const notes = getStore().getState().notes
  return ids ? ids.split(' ').flatMap((id) => (notes[id] ? [notes[id]] : [])) : []
}

const label = (n: number) => `Linked from ${n} ${n === 1 ? 'note' : 'notes'}`

/** Status bar: "Linked from 2 notes", opening a list of them. Hidden when nothing links here. */
export function LinkedFromMenu({ noteId }: { noteId: string }) {
  const from = useLinkedFrom(noteId)
  if (!from.length) return null
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        aria-label={label(from.length)}
        title={label(from.length)}
        className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-bg-hover hover:text-fg"
      >
        <Link2 size={11} />
        {from.length}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="top"
          align="end"
          sideOffset={4}
          className="z-50 max-h-80 min-w-48 max-w-80 overflow-y-auto rounded-md border border-border bg-bg-elev p-1 shadow-lg"
        >
          <DropdownMenu.Label className="px-2 py-1 text-[11px] text-fg-faint">
            Linked from
          </DropdownMenu.Label>
          {from.map((n) => (
            <DropdownMenu.Item
              key={n.id}
              onSelect={() => getStore().getState().openNote(n.id)}
              className="flex min-h-8 cursor-default items-center truncate rounded px-2 py-1 text-[12.5px] text-fg outline-none data-[highlighted]:bg-bg-hover"
            >
              {displayTitle(n)}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
