import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers'
import {
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { displayTitle } from '../../domain/title'
import { orderedTabs } from '../../store/selectors'
import { getStore, useAppStore } from '../../store/store'
import { TabItem } from './TabItem'
import { TabOverflowMenu } from './TabOverflowMenu'

export function TabBar({ actions }: { actions?: ReactNode }) {
  const tabs = useAppStore(useShallow(orderedTabs))
  const activeId = useAppStore((s) => s.session.activeTabId)
  const [unpinId, setUnpinId] = useState<string | null>(null)
  const s = () => getStore().getState()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const requestClose = (id: string) => {
    if (s().notes[id]?.pinned) setUnpinId(id)
    else s().closeTab(id)
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const ids = s().session.openTabIds
    s().moveTab(ids.indexOf(String(active.id)), ids.indexOf(String(over.id)))
  }

  const unpinNote = unpinId ? s().notes[unpinId] : null

  return (
    <header className="flex h-9 shrink-0 items-end gap-1 bg-bg-sunken pl-1.5 pr-1">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToHorizontalAxis]}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={tabs.map((t) => t.id)} strategy={horizontalListSortingStrategy}>
          <div
            role="tablist"
            aria-label="Open notes"
            className="flex min-w-0 items-end gap-0.5 overflow-x-auto [scrollbar-width:none]"
          >
            {tabs.map((n) => (
              <TabItem
                key={n.id}
                note={n}
                active={n.id === activeId}
                onRequestClose={requestClose}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <button
        type="button"
        aria-label="New note"
        title="New note"
        onClick={() => s().newNote()}
        className="mb-1 grid size-7 shrink-0 place-items-center rounded-md text-fg-muted hover:bg-bg-hover hover:text-fg"
      >
        <Plus size={15} strokeWidth={1.75} />
      </button>
      <div className="flex-1" />
      <div className="mb-1 flex items-center gap-0.5">
        <TabOverflowMenu tabs={tabs} activeId={activeId} />
        {actions}
      </div>

      <AlertDialog.Root open={unpinId !== null} onOpenChange={(o) => !o && setUnpinId(null)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/30" />
          <AlertDialog.Content className="fixed left-1/2 top-1/3 z-50 w-80 -translate-x-1/2 rounded-lg border border-border bg-bg-elev p-4 shadow-xl">
            <AlertDialog.Title className="text-sm font-medium text-fg">
              Unpin “{unpinNote ? displayTitle(unpinNote) : ''}”?
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-1.5 text-[12.5px] text-fg-muted">
              Pinned notes always stay open. Unpin it to close the tab — the note itself is kept.
            </AlertDialog.Description>
            <div className="mt-4 flex justify-end gap-2">
              <AlertDialog.Cancel className="rounded-md px-3 py-1.5 text-[12.5px] text-fg-muted hover:bg-bg-hover">
                Cancel
              </AlertDialog.Cancel>
              <AlertDialog.Action
                className="rounded-md bg-accent px-3 py-1.5 text-[12.5px] text-accent-fg"
                onClick={() => {
                  if (!unpinId) return
                  s().togglePin(unpinId)
                  s().closeTab(unpinId)
                }}
              >
                Unpin and close
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </header>
  )
}
