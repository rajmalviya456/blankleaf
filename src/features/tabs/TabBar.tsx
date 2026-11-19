import { useIsTouch } from '../../lib/media'
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
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers'
import {
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { ChevronDown, Plus } from 'lucide-react'
import { TemplateMenu } from '../templates/TemplateMenu'
import type { ReactNode } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { orderedTabs } from '../../store/selectors'
import { getStore, useAppStore } from '../../store/store'
import { TabItem } from './TabItem'
import { TabOverflowMenu } from './TabOverflowMenu'
import { UnpinPrompt } from './UnpinPrompt'
import { requestCloseTab } from './requestCloseTab'

export function TabBar({ actions }: { actions?: ReactNode }) {
  const tabs = useAppStore(useShallow(orderedTabs))
  // Blank "Untitled" tabs are nothing to pick from, so the ⌄ menu skips them.
  const listed = tabs.filter((n) => n.title?.trim() || /\S/.test(n.content))
  const activeId = useAppStore((s) => s.session.activeTabId)
  const s = () => getStore().getState()

  // Touch: press-and-hold to drag, so a swipe still scrolls the tab strip.
  const touch = useIsTouch()
  const sensors = useSensors(
    useSensor(
      touch ? TouchSensor : PointerSensor,
      touch
        ? { activationConstraint: { delay: 200, tolerance: 5 } }
        : { activationConstraint: { distance: 5 } },
    ),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const requestClose = requestCloseTab

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const ids = s().session.openTabIds
    s().moveTab(ids.indexOf(String(active.id)), ids.indexOf(String(over.id)))
  }

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
      <TemplateMenu className="mb-1 -ml-1 grid h-7 w-6 shrink-0 place-items-center rounded-md text-fg-faint outline-none hover:bg-bg-hover hover:text-fg focus-visible:bg-bg-hover">
        <ChevronDown size={12} />
      </TemplateMenu>
      <div className="flex-1" />
      <div className="mb-1 flex items-center gap-0.5">
        {listed.length > 1 && <TabOverflowMenu tabs={listed} activeId={activeId} />}
        {actions}
      </div>

      <UnpinPrompt />
    </header>
  )
}
