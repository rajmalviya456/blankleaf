import { LockKeyhole, Pin, Plus, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { noteHasTag, sameTag, tagCounts } from '../../domain/tags'
import { useShallow } from 'zustand/react/shallow'
import { displayTitle } from '../../domain/title'
import { relativeTime } from '../../lib/relativeTime'
import { useNow } from '../../lib/useNow'
import { liveNotesSorted } from '../../store/selectors'
import { getStore, useAppStore } from '../../store/store'
import { PanelHeader } from './panelParts'
import { rowClass } from './rowClass'
import { toast } from '../../ui/toast'
import { useIsTouch } from '../../lib/media'
import { NoteRowMenu } from './NoteRowMenu'
import { SortMenu } from './SortMenu'

/** Move a note to Trash from the list (it stays closed) and offer an Undo. */
function trashFromList(id: string) {
  const s = getStore().getState()
  const note = s.notes[id]
  if (!note) return
  s.trashNote(id)
  toast(`Moved “${displayTitle(note)}” to Trash`, {
    action: { label: 'Undo', run: () => getStore().getState().restoreNote(id) },
  })
}

function preview(content: string): string {
  const lines = content.split('\n', 6).filter((l) => l.trim())
  return (lines[1] ?? '').trim().slice(0, 80)
}

/**
 * All notes, newest first. `onOpened` runs after a note is opened (the phone Library closes);
 * on touch screens each row has a ⋯ menu instead of the hover-only trash button.
 */
export function NotesList({ onOpened }: { onOpened?: () => void } = {}) {
  const touch = useIsTouch()
  // Touch: ⋯ or a long-press (500ms) on a row opens its menu.
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const press = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const longPress = useRef(false)
  const allNotes = useAppStore(useShallow(liveNotesSorted))
  const tags = useMemo(() => tagCounts(allNotes), [allNotes])
  const wanted = useAppStore((s) => s.ui.tagFilter)
  // A filter on a tag that no longer exists shows everything.
  const filter = tags.find((t) => wanted !== null && sameTag(t.tag, wanted))?.tag ?? null
  const notes = filter ? allNotes.filter((n) => noteHasTag(n, filter)) : allNotes
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
          <>
            <SortMenu />
            <button
              type="button"
              aria-label="New note"
              title="New note"
              onClick={() => s().newNote()}
              className="grid size-6 place-items-center rounded text-fg-muted hover:bg-bg-hover hover:text-fg max-sm:size-11"
            >
              <Plus size={14} />
            </button>
          </>
        }
      />
      {tags.length > 0 && (
        <div
          role="group"
          aria-label="Filter by tag"
          className="flex shrink-0 gap-1 overflow-x-auto px-2 pb-1.5 [scrollbar-width:none]"
        >
          {tags.map(({ tag, count }) => (
            <button
              key={tag}
              type="button"
              aria-pressed={tag === filter}
              aria-label={`${tag}, ${count} ${count === 1 ? 'note' : 'notes'}`}
              onClick={() => s().setUi({ tagFilter: tag === filter ? null : tag })}
              className="max-w-40 shrink-0 truncate rounded-full border border-border px-2 py-0.5 text-[11.5px] text-fg-muted hover:bg-bg-hover hover:text-fg aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-fg max-sm:min-h-9 max-sm:px-3 max-sm:text-[13px]"
            >
              {tag}
            </button>
          ))}
        </div>
      )}
      <ul aria-label="Notes" className="flex-1 overflow-y-auto px-1.5 pb-2">
        {notes.map((n) => {
          const sub = preview(n.content)
          return (
            <li key={n.id} className="group relative">
              <button
                type="button"
                onClick={() => {
                  if (longPress.current) return void (longPress.current = false)
                  s().openNote(n.id)
                  onOpened?.()
                }}
                onContextMenu={
                  touch
                    ? (e) => {
                        e.preventDefault()
                        setMenuFor(n.id)
                      }
                    : undefined
                }
                onPointerDown={
                  touch
                    ? () => {
                        longPress.current = false
                        press.current = setTimeout(() => {
                          longPress.current = true
                          setMenuFor(n.id)
                        }, 500)
                      }
                    : undefined
                }
                onPointerUp={touch ? () => clearTimeout(press.current) : undefined}
                onPointerLeave={touch ? () => clearTimeout(press.current) : undefined}
                onKeyDown={(e) => {
                  if (e.key === 'Delete' || (e.key === 'Backspace' && (e.metaKey || e.ctrlKey))) {
                    e.preventDefault()
                    trashFromList(n.id)
                  }
                }}
                aria-current={n.id === activeId ? 'true' : undefined}
                className={rowClass(n.id === activeId) + (touch ? ' min-h-12 pr-12' : '')}
              >
                <span className="flex items-center gap-1.5">
                  {n.pinned && <Pin size={10} className="shrink-0 text-warn" aria-label="Pinned" />}
                  {n.locked && (
                    <LockKeyhole size={10} className="shrink-0 text-fg-muted" aria-label="Locked" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-fg">{displayTitle(n)}</span>
                  {openIds.includes(n.id) && (
                    <span
                      className="size-1.5 shrink-0 rounded-full bg-accent group-focus-within:invisible group-hover:invisible"
                      title="Open in a tab"
                    />
                  )}
                  <span className="shrink-0 text-[10.5px] tabular-nums text-fg-faint group-focus-within:invisible group-hover:invisible">
                    {relativeTime(n.updatedAt, now)}
                  </span>
                </span>
                {sub && <span className="block truncate text-[11.5px] text-fg-faint">{sub}</span>}
                {!!n.tags?.length && (
                  <span className="block truncate text-[11px] text-fg-muted">
                    {n.tags.map((t) => `#${t}`).join(' ')}
                  </span>
                )}
              </button>
              {touch ? (
                <NoteRowMenu
                  note={n}
                  title={displayTitle(n)}
                  onOpen={() => {
                    s().openNote(n.id)
                    onOpened?.()
                  }}
                  onTrash={() => trashFromList(n.id)}
                  open={menuFor === n.id}
                  onOpenChange={(o) => setMenuFor(o ? n.id : null)}
                />
              ) : (
                <button
                  type="button"
                  aria-label={`Move “${displayTitle(n)}” to Trash`}
                  title="Move to Trash (Delete)"
                  onClick={() => trashFromList(n.id)}
                  className="absolute right-1 top-1 grid size-6 place-items-center rounded text-fg-muted opacity-0 hover:bg-bg-hover outline-none hover:text-danger focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100"
                >
                  <Trash2 size={13} />
                </button>
              )}
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
