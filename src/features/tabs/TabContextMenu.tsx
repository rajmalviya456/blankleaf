import * as ContextMenu from '@radix-ui/react-context-menu'
import type { ReactNode } from 'react'
import type { Note } from '../../domain/types'
import { getStore } from '../../store/store'
import { exportNote } from '../backup/actions'
import { exportNoteAs } from '../export/exportNote'
import { historyStore } from '../history/historyStore'
import { printStore } from '../print/printStore'
import { tagsStore } from '../tags/tagsStore'
import { shareStore } from '../share/shareStore'

interface Props {
  note: Note
  onClose(id: string): void
  children: ReactNode
}

const itemClass =
  'flex cursor-default select-none items-center rounded px-2 py-1.5 text-[12.5px] text-fg outline-none data-[disabled]:text-fg-faint data-[highlighted]:bg-accent-soft data-[highlighted]:text-fg'

export function TabContextMenu({ note, onClose, children }: Props) {
  const s = () => getStore().getState()
  const copy = () => void navigator.clipboard?.writeText(note.content).catch(() => {})

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content
          className="z-50 min-w-48 rounded-md border border-border bg-bg-elev p-1 shadow-lg"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <ContextMenu.Item
            className={itemClass}
            onSelect={() => s().setUi({ renamingId: note.id })}
          >
            Rename
          </ContextMenu.Item>
          <ContextMenu.Item className={itemClass} onSelect={() => s().togglePin(note.id)}>
            {note.pinned ? 'Unpin' : 'Pin'}
          </ContextMenu.Item>
          <ContextMenu.Item className={itemClass} onSelect={() => s().duplicateNote(note.id)}>
            Duplicate
          </ContextMenu.Item>
          <ContextMenu.Item
            className={itemClass}
            onSelect={() => tagsStore.getState().open(note.id)}
          >
            Tags…
          </ContextMenu.Item>
          <ContextMenu.Separator className="my-1 h-px bg-border" />
          <ContextMenu.Item className={itemClass} onSelect={() => onClose(note.id)}>
            Close
          </ContextMenu.Item>
          <ContextMenu.Item className={itemClass} onSelect={() => s().closeOthers(note.id)}>
            Close others
          </ContextMenu.Item>
          <ContextMenu.Item className={itemClass} onSelect={() => s().closeToRight(note.id)}>
            Close to the right
          </ContextMenu.Item>
          <ContextMenu.Separator className="my-1 h-px bg-border" />
          <ContextMenu.Item
            className={`${itemClass} data-[highlighted]:text-danger`}
            onSelect={() => s().trashNote(note.id)}
          >
            Move to Trash
          </ContextMenu.Item>
          <ContextMenu.Item className={itemClass} onSelect={copy}>
            Copy content
          </ContextMenu.Item>
          <ContextMenu.Item className={itemClass} onSelect={() => exportNote(note.id)}>
            Export
          </ContextMenu.Item>
          <ContextMenu.Item
            className={itemClass}
            onSelect={() => void exportNoteAs(note.id, 'html')}
          >
            Export as web page
          </ContextMenu.Item>
          <ContextMenu.Item
            className={itemClass}
            onSelect={() => void exportNoteAs(note.id, 'docx')}
          >
            Export as Word
          </ContextMenu.Item>
          <ContextMenu.Item
            className={itemClass}
            onSelect={() => printStore.getState().open(note.id)}
          >
            Print / save as PDF…
          </ContextMenu.Item>
          <ContextMenu.Item
            className={itemClass}
            onSelect={() => shareStore.getState().open(note.id)}
          >
            Share…
          </ContextMenu.Item>
          <ContextMenu.Item
            className={itemClass}
            onSelect={() => historyStore.getState().open(note.id)}
          >
            Version history…
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}
