import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Pin, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { displayTitle } from '../../domain/title'
import type { Note } from '../../domain/types'
import { getStore, useAppStore } from '../../store/store'
import { RenameInput } from './RenameInput'
import { TabContextMenu } from './TabContextMenu'

interface Props {
  note: Note
  active: boolean
  onRequestClose(id: string): void
}

export function TabItem({ note, active, onRequestClose }: Props) {
  const renaming = useAppStore((s) => s.ui.renamingId === note.id)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: note.id,
    disabled: renaming,
  })
  const ref = useRef<HTMLDivElement | null>(null)
  const title = displayTitle(note)
  const s = () => getStore().getState()

  useEffect(() => {
    if (active) ref.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }, [active])

  return (
    <TabContextMenu note={note} onClose={onRequestClose}>
      <div
        ref={(el) => {
          setNodeRef(el)
          ref.current = el
        }}
        {...attributes}
        {...listeners}
        role="tab"
        aria-selected={active}
        tabIndex={active ? 0 : -1}
        title={title}
        style={{ transform: CSS.Translate.toString(transform), transition }}
        onClick={() => s().setActive(note.id)}
        onDoubleClick={() => s().setUi({ renamingId: note.id })}
        onMouseDown={(e) => {
          if (e.button === 1) e.preventDefault() // no autoscroll on middle-click
        }}
        onAuxClick={(e) => {
          if (e.button === 1) {
            e.preventDefault()
            onRequestClose(note.id)
          }
        }}
        className={[
          'group relative flex h-7 max-w-56 min-w-24 shrink-0 cursor-default select-none items-center gap-1.5 rounded-t-md pl-3 pr-1.5 text-[12.5px] outline-none',
          active
            ? 'bg-bg text-fg shadow-[inset_0_2px_0_var(--accent)]'
            : 'text-fg-muted hover:bg-bg-hover hover:text-fg',
          isDragging ? 'z-10 opacity-80' : '',
        ].join(' ')}
      >
        {note.pinned && (
          <Pin aria-label="Pinned" size={11} strokeWidth={2} className="shrink-0 text-warn" />
        )}
        {renaming ? (
          <RenameInput
            initial={note.title ?? title}
            onCommit={(v) => {
              s().renameNote(note.id, v)
              s().setUi({ renamingId: null })
            }}
            onCancel={() => s().setUi({ renamingId: null })}
          />
        ) : (
          <span className="min-w-0 flex-1 truncate">{title}</span>
        )}
        {!note.pinned && !renaming && (
          <button
            type="button"
            aria-label={`Close ${title}`}
            tabIndex={-1}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onRequestClose(note.id)
            }}
            className={[
              'grid size-4.5 shrink-0 place-items-center rounded text-fg-faint hover:bg-bg-hover hover:text-fg',
              active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100',
            ].join(' ')}
          >
            <X size={12} strokeWidth={2} />
          </button>
        )}
      </div>
    </TabContextMenu>
  )
}
