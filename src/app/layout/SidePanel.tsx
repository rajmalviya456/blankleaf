import { NotesList } from '../../features/sidebar/NotesList'
import { SearchPanel } from '../../features/sidebar/SearchPanel'
import { TrashPanel } from '../../features/sidebar/TrashPanel'
import { useAppStore } from '../../store/store'

/** Collapsible panel opened from the rail: notes, search or trash. */
export function SidePanel() {
  const { open, panel } = useAppStore((s) => s.session.sidebar)
  if (!open) return null
  return (
    <aside
      aria-label="Side panel"
      className="flex w-64 shrink-0 flex-col border-r border-border bg-bg-elev"
    >
      {panel === 'notes' && <NotesList />}
      {panel === 'search' && <SearchPanel />}
      {panel === 'trash' && <TrashPanel />}
    </aside>
  )
}
