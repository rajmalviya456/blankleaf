import { X } from 'lucide-react'
import { useMemo } from 'react'
import { currentHeading, outline } from '../../domain/outline'
import { useCalmValue } from '../../lib/useCalmValue'
import { getStore, useAppStore } from '../../store/store'
import { viewForNote } from '../editor/activeView'

/** Put the cursor on a heading and give the editor focus, so typing carries on there. */
function jumpTo(noteId: string, from: number) {
  getStore().getState().reveal(noteId, from, from)
  viewForNote(noteId)?.focus()
}

/** The note's headings beside the editor; click one to jump there. */
export function OutlinePanel({ noteId }: { noteId: string }) {
  const content = useCalmValue(useAppStore((s) => s.notes[noteId]?.content ?? ''))
  const head = useAppStore((s) => s.session.perTab[noteId]?.head ?? 0)
  const headings = useMemo(() => outline(content), [content])
  const current = currentHeading(headings, head)
  const top = Math.min(...headings.map((h) => h.level))

  return (
    <nav
      aria-label="Outline"
      className="flex w-56 shrink-0 flex-col border-l border-border bg-bg text-[12.5px] max-md:hidden"
    >
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-border pl-3 pr-1 text-fg-muted">
        <span aria-hidden="true" className="flex-1 font-medium">
          Outline
        </span>
        <button
          type="button"
          aria-label="Close outline"
          title="Close outline"
          onClick={() => getStore().getState().updateSettings({ showOutline: false })}
          className="grid size-6 place-items-center rounded hover:bg-bg-hover hover:text-fg"
        >
          <X size={14} />
        </button>
      </div>
      {headings.length ? (
        <ul className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {headings.map((h, i) => (
            <li key={`${h.from}-${h.text}`}>
              <button
                type="button"
                aria-current={i === current ? 'location' : undefined}
                title={h.text}
                onClick={() => jumpTo(noteId, h.from)}
                style={{ paddingLeft: `${8 + (h.level - top) * 12}px` }}
                className={`block min-h-7 w-full truncate rounded py-1 pr-2 text-left hover:bg-bg-hover hover:text-fg ${
                  i === current ? 'bg-accent-soft font-medium text-fg' : 'text-fg-muted'
                }`}
              >
                {h.text}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="p-3 text-fg-muted">
          No headings yet. Start a line with # and a space to add one.
        </p>
      )}
    </nav>
  )
}
