import { FileText, Search, Trash2 } from 'lucide-react'
import type { SidePanel } from '../../domain/types'
import { getStore, useAppStore } from '../../store/store'

const ITEMS = [
  { id: 'notes', label: 'Notes', Icon: FileText },
  { id: 'search', label: 'Search', Icon: Search },
  { id: 'trash', label: 'Trash', Icon: Trash2 },
] as const

/** Slim icon rail. Clicking the active item closes the panel. */
export function Rail() {
  const { open, panel } = useAppStore((s) => s.session.sidebar)
  const trashCount = useAppStore(
    (s) => Object.values(s.notes).filter((n) => n.deletedAt !== null).length,
  )

  const toggle = (id: SidePanel) => {
    const s = getStore().getState()
    if (open && panel === id) s.setSidebar({ open: false })
    else s.setSidebar({ open: true, panel: id })
  }

  return (
    <nav
      aria-label="Sidebar"
      className="flex w-10 shrink-0 flex-col items-center gap-1 border-r border-border bg-bg-sunken pt-2"
    >
      {ITEMS.map(({ id, label, Icon }) => {
        const active = open && panel === id
        return (
          <button
            key={id}
            type="button"
            aria-label={label}
            aria-pressed={active}
            title={label}
            onClick={() => toggle(id)}
            className={[
              'relative grid size-8 place-items-center rounded-md',
              active
                ? 'bg-accent-soft text-accent'
                : 'text-fg-muted hover:bg-bg-hover hover:text-fg',
            ].join(' ')}
          >
            <Icon size={16} strokeWidth={1.75} />
            {id === 'trash' && trashCount > 0 && (
              <span
                aria-hidden
                className="absolute right-1 top-1 size-1.5 rounded-full bg-fg-faint"
              />
            )}
          </button>
        )
      })}
    </nav>
  )
}
