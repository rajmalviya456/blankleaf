import { FileText, Search, Trash2 } from 'lucide-react'

/** Slim icon rail that opens the side panel. Wired to state in Task 9. */
export function Rail() {
  const items = [
    { id: 'notes', label: 'Notes', Icon: FileText },
    { id: 'search', label: 'Search', Icon: Search },
    { id: 'trash', label: 'Trash', Icon: Trash2 },
  ] as const
  return (
    <nav
      aria-label="Sidebar"
      className="flex w-10 shrink-0 flex-col items-center gap-1 border-r border-border bg-bg-sunken pt-2"
    >
      {items.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          aria-label={label}
          title={label}
          className="grid size-8 place-items-center rounded-md text-fg-muted hover:bg-bg-hover hover:text-fg"
        >
          <Icon size={16} strokeWidth={1.75} />
        </button>
      ))}
    </nav>
  )
}
