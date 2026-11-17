import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import * as Dialog from '@radix-ui/react-dialog'
import { GripVertical, MoreHorizontal, Pin, Plus, RotateCcw, X } from 'lucide-react'
import { useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { displayTitle } from '../../domain/title'
import type { Note } from '../../domain/types'
import { orderedTabs } from '../../store/selectors'
import { getStore, useAppStore } from '../../store/store'
import { DialogSurface } from '../../ui/DialogSurface'
import { RenameInput } from '../tabs/RenameInput'
import { requestCloseTab } from '../tabs/requestCloseTab'
import { phoneStore } from './phoneStore'

const LONG_PRESS_MS = 500
const small = 'grid size-11 shrink-0 place-items-center rounded-lg text-fg-muted active:bg-bg-hover'

function Row({ note, active }: { note: Note; active: boolean }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } =
    useSortable({ id: note.id })
  const renaming = useAppStore((s) => s.ui.renamingId === note.id)
  const title = displayTitle(note)
  const s = () => getStore().getState()
  const press = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const actions = () => phoneStore.getState().open({ kind: 'tabActions', noteId: note.id })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={['flex items-center gap-0.5 rounded-xl pr-1', active ? 'bg-accent-soft' : ''].join(
        ' ',
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        aria-label={`Reorder ${title}`}
        className={small + ' touch-none cursor-grab'}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>
      {renaming ? (
        <div className="flex h-12 min-w-0 flex-1 items-center">
          <RenameInput
            initial={note.title ?? title}
            onCommit={(v) => {
              s().renameNote(note.id, v)
              s().setUi({ renamingId: null })
            }}
            onCancel={() => s().setUi({ renamingId: null })}
          />
        </div>
      ) : (
        <button
          type="button"
          aria-label={title}
          aria-current={active ? 'true' : undefined}
          onClick={() => {
            s().setActive(note.id)
            phoneStore.getState().closeAll()
          }}
          onContextMenu={(e) => {
            e.preventDefault()
            actions()
          }}
          onPointerDown={() => (press.current = setTimeout(actions, LONG_PRESS_MS))}
          onPointerUp={() => clearTimeout(press.current)}
          onPointerLeave={() => clearTimeout(press.current)}
          className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-lg px-1 text-left text-[15px] select-none"
        >
          {note.pinned && <Pin size={13} className="shrink-0 text-warn" aria-hidden />}
          <span
            className={['truncate', active ? 'font-semibold text-accent' : 'text-fg'].join(' ')}
          >
            {title}
          </span>
        </button>
      )}
      <button type="button" aria-label={`Actions for ${title}`} onClick={actions} className={small}>
        <MoreHorizontal size={18} />
      </button>
      <button
        type="button"
        aria-label={`Close ${title}`}
        onClick={() => requestCloseTab(note.id)}
        className={small}
      >
        <X size={17} />
      </button>
    </li>
  )
}

/** Bottom sheet with every open tab: switch, close, act on, rename and reorder them. */
export function TabsSheet({ open, onClose }: { open: boolean; onClose(): void }) {
  const tabs = useAppStore(useShallow(orderedTabs))
  const activeId = useAppStore((s) => s.session.activeTabId)
  const canReopen = useAppStore((s) => s.session.closedStack.length > 0)
  const s = () => getStore().getState()
  const sensors = useSensors(
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const ids = s().session.openTabIds
    s().moveTab(ids.indexOf(String(active.id)), ids.indexOf(String(over.id)))
  }
  const footerBtn =
    'flex h-12 flex-1 items-center justify-center gap-2 rounded-xl text-[15px] active:bg-bg-hover disabled:opacity-40'

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="np-overlay fixed inset-0 z-40" />
        <DialogSurface
          aria-describedby={undefined}
          className="fixed left-1/2 top-[10vh] flex w-96 -translate-x-1/2 flex-col px-2"
        >
          <Dialog.Title className="px-3 pb-1 text-[12px] font-semibold uppercase tracking-wider text-fg-faint">
            Open tabs
          </Dialog.Title>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={onDragEnd}
          >
            <SortableContext items={tabs.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <ul aria-label="Open tabs" className="max-h-[60dvh] space-y-0.5 overflow-y-auto">
                {tabs.map((n) => (
                  <Row key={n.id} note={n} active={n.id === activeId} />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
          <div className="mt-1 flex gap-1 border-t border-border pt-1">
            <button
              type="button"
              className={footerBtn + ' text-accent'}
              onClick={() => {
                s().newNote()
                phoneStore.getState().closeAll()
              }}
            >
              <Plus size={17} /> New note
            </button>
            <button
              type="button"
              disabled={!canReopen}
              className={footerBtn + ' text-fg'}
              onClick={() => {
                s().reopenClosedTab()
                phoneStore.getState().closeAll()
              }}
            >
              <RotateCcw size={16} /> Reopen closed tab
            </button>
          </div>
        </DialogSurface>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
