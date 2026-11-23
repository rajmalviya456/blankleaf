import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  Download,
  ExternalLink,
  History,
  MoreHorizontal,
  Pin,
  PinOff,
  Share2,
  Tag,
  Trash2,
} from 'lucide-react'
import type { Note } from '../../domain/types'
import { exportNote } from '../backup/actions'
import { tagsStore } from '../tags/tagsStore'
import { shareStore } from '../share/shareStore'
import { historyStore } from '../history/historyStore'
import { getStore } from '../../store/store'

const item =
  'flex min-h-11 cursor-default select-none items-center gap-3 rounded-md px-3 text-[14px] text-fg outline-none data-[highlighted]:bg-accent-soft'

/** ⋯ button (and long-press on the row) with a note's actions — for touch screens. */
export function NoteRowMenu({
  note,
  title,
  onOpen,
  onTrash,
  open,
  onOpenChange,
}: {
  note: Note
  title: string
  onOpen(): void
  onTrash(): void
  open: boolean
  onOpenChange(open: boolean): void
}) {
  return (
    <DropdownMenu.Root open={open} onOpenChange={onOpenChange} modal={false}>
      <DropdownMenu.Trigger
        aria-label={`Actions for ${title}`}
        className="absolute right-1 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-lg text-fg-muted active:bg-bg-hover"
      >
        <MoreHorizontal size={18} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-52 rounded-lg border border-border bg-bg-elev p-1 shadow-xl"
        >
          <DropdownMenu.Item className={item} onSelect={onOpen}>
            <ExternalLink size={16} aria-hidden /> Open
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className={item}
            onSelect={() => getStore().getState().togglePin(note.id)}
          >
            {note.pinned ? <PinOff size={16} aria-hidden /> : <Pin size={16} aria-hidden />}
            {note.pinned ? 'Unpin' : 'Pin'}
          </DropdownMenu.Item>
          <DropdownMenu.Item className={item} onSelect={() => tagsStore.getState().open(note.id)}>
            <Tag size={16} aria-hidden /> Tags…
          </DropdownMenu.Item>
          {!note.locked && (
            <>
              <DropdownMenu.Item
                className={item}
                onSelect={() => shareStore.getState().open(note.id)}
              >
                <Share2 size={16} aria-hidden /> Share…
              </DropdownMenu.Item>
              <DropdownMenu.Item className={item} onSelect={() => exportNote(note.id)}>
                <Download size={16} aria-hidden /> Download
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className={item}
                onSelect={() => historyStore.getState().open(note.id)}
              >
                <History size={16} aria-hidden /> Version history…
              </DropdownMenu.Item>
            </>
          )}
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item className={item + ' text-danger'} onSelect={onTrash}>
            <Trash2 size={16} aria-hidden /> Move to Trash
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
