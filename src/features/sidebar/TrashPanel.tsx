import { useIsTouch } from '../../lib/media'
import { RotateCcw, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { TRASH_RETENTION_DAYS } from '../../domain/defaults'
import { displayTitle } from '../../domain/title'
import { relativeTime } from '../../lib/relativeTime'
import { useNow } from '../../lib/useNow'
import { trashedNotes } from '../../store/selectors'
import { getStore, useAppStore } from '../../store/store'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { toast } from '../../ui/toast'
import { PanelHeader } from './panelParts'

type Pending = { kind: 'one'; id: string; title: string } | { kind: 'all' } | null

export function TrashPanel() {
  const notes = useAppStore(useShallow(trashedNotes))
  const [pending, setPending] = useState<Pending>(null)
  const s = () => getStore().getState()
  const now = useNow()
  const btnSize = useIsTouch() ? 'size-11' : 'size-6'
  const list = useRef<HTMLUListElement>(null)
  // Where focus goes after a row leaves: the same button on the next row (or the one before),
  // else the list itself, never lost to the page.
  const nextFocus = (id: string, button: 'restore' | 'delete'): HTMLElement | null => {
    const rows = [...(list.current?.querySelectorAll<HTMLElement>('li[data-note]') ?? [])]
    const at = rows.findIndex((r) => r.dataset.note === id)
    const row = rows[at + 1] ?? rows[at - 1]
    return row?.querySelector<HTMLElement>(`[data-action="${button}"]`) ?? list.current
  }
  const afterConfirm = useRef<HTMLElement | null>(null)

  const restore = (id: string, title: string) => {
    const target = nextFocus(id, 'restore')
    s().restoreNote(id)
    target?.focus()
    toast(`Restored “${title}”`, {
      action: { label: 'Open', run: () => getStore().getState().openNote(id) },
    })
  }

  return (
    <>
      <PanelHeader
        title="Trash"
        count={notes.length}
        action={
          notes.length > 0 && (
            <button
              type="button"
              onClick={() => setPending({ kind: 'all' })}
              className="rounded px-1.5 py-0.5 text-[11.5px] text-fg-muted hover:bg-bg-hover hover:text-danger"
            >
              Empty Trash
            </button>
          )
        }
      />
      <p className="px-3 pb-2 text-[11px] leading-snug text-fg-faint">
        Notes here are deleted for good after {TRASH_RETENTION_DAYS} days.
      </p>
      <ul
        ref={list}
        aria-label="Trashed notes"
        // Focus lands here when the last note leaves the list.
        tabIndex={-1}
        className="flex-1 overflow-y-auto px-1.5 pb-2 outline-none"
      >
        {notes.map((n) => {
          const title = displayTitle(n)
          return (
            <li
              key={n.id}
              data-note={n.id}
              className="group flex items-center gap-1 rounded-md px-2 py-1.5 hover:bg-bg-hover"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] text-fg-muted">{title}</span>
                <span className="text-[10.5px] text-fg-faint">
                  Deleted {relativeTime(n.deletedAt ?? now, now)}
                  {relativeTime(n.deletedAt ?? now, now) === 'just now' ? '' : ' ago'}
                </span>
              </span>
              <button
                type="button"
                aria-label={`Restore ${title}`}
                title="Restore"
                data-action="restore"
                onClick={() => restore(n.id, title)}
                className={`grid ${btnSize} place-items-center rounded text-fg-muted hover:bg-bg-elev hover:text-fg`}
              >
                <RotateCcw size={13} />
              </button>
              <button
                type="button"
                aria-label={`Delete ${title} permanently`}
                title="Delete permanently"
                data-action="delete"
                onClick={() => setPending({ kind: 'one', id: n.id, title })}
                className={`grid ${btnSize} place-items-center rounded text-fg-muted hover:bg-bg-elev hover:text-danger`}
              >
                <Trash2 size={13} />
              </button>
            </li>
          )
        })}
        {notes.length === 0 && (
          <li className="px-2 py-6 text-center text-[12px] text-fg-faint">Trash is empty.</li>
        )}
      </ul>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(o) => !o && setPending(null)}
        danger
        title={
          pending?.kind === 'one'
            ? `Delete “${pending.title}” permanently?`
            : `Empty Trash (${notes.length} notes)?`
        }
        description="This can’t be undone."
        confirmLabel={pending?.kind === 'one' ? 'Delete permanently' : 'Empty Trash'}
        onConfirm={() => {
          if (pending?.kind === 'one') {
            afterConfirm.current = nextFocus(pending.id, 'delete')
            s().purgeNote(pending.id)
          } else {
            afterConfirm.current = list.current
            s().emptyTrash()
          }
          setPending(null)
        }}
        onCloseAutoFocus={(e) => {
          // The button that opened it may be gone with its note.
          const target = afterConfirm.current
          afterConfirm.current = null
          if (!target) return
          e.preventDefault()
          target.focus()
        }}
      />
    </>
  )
}
