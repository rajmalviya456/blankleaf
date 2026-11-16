import { Pin, Plus } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { displayTitle } from '../../domain/title'
import { relativeTime } from '../../lib/relativeTime'
import { useNow } from '../../lib/useNow'
import { liveNotesSorted } from '../../store/selectors'
import { getStore, useAppStore } from '../../store/store'
import { PanelHeader } from './panelParts'
import { rowClass } from './rowClass'

function preview(content: string): string {
  const lines = content.split('\n', 6).filter((l) => l.trim())
  return (lines[1] ?? '').trim().slice(0, 80)
}

export function NotesList() {
  const notes = useAppStore(useShallow(liveNotesSorted))
  const activeId = useAppStore((s) => s.session.activeTabId)
  const openIds = useAppStore((s) => s.session.openTabIds)
  const s = () => getStore().getState()
  const now = useNow()

  return (
    <>
      <PanelHeader
        title="Notes"
        count={notes.length}
        action={
          <button
            type="button"
            aria-label="New note"
            title="New note"
            onClick={() => s().newNote()}
            className="grid size-6 place-items-center rounded text-fg-muted hover:bg-bg-hover hover:text-fg"
          >
            <Plus size={14} />
          </button>
        }
      />
      <ul aria-label="Notes" className="flex-1 overflow-y-auto px-1.5 pb-2">
        {notes.map((n) => {
          const sub = preview(n.content)
          return (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => s().openNote(n.id)}
                aria-current={n.id === activeId ? 'true' : undefined}
                className={rowClass(n.id === activeId)}
              >
                <span className="flex items-center gap-1.5">
                  {n.pinned && <Pin size={10} className="shrink-0 text-warn" aria-label="Pinned" />}
                  <span className="min-w-0 flex-1 truncate text-fg">{displayTitle(n)}</span>
                  {openIds.includes(n.id) && (
                    <span
                      className="size-1.5 shrink-0 rounded-full bg-accent"
                      title="Open in a tab"
                    />
                  )}
                  <span className="shrink-0 text-[10.5px] tabular-nums text-fg-faint">
                    {relativeTime(n.updatedAt, now)}
                  </span>
                </span>
                {sub && <span className="block truncate text-[11.5px] text-fg-faint">{sub}</span>}
              </button>
            </li>
          )
        })}
        {notes.length === 0 && (
          <li className="px-2 py-6 text-center text-[12px] text-fg-faint">No notes yet.</li>
        )}
      </ul>
    </>
  )
}
