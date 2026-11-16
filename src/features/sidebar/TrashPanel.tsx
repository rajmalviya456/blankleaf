import { RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { TRASH_RETENTION_DAYS } from '../../domain/defaults'
import { displayTitle } from '../../domain/title'
import { relativeTime } from '../../lib/relativeTime'
import { useNow } from '../../lib/useNow'
import { trashedNotes } from '../../store/selectors'
import { getStore, useAppStore } from '../../store/store'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { PanelHeader } from './panelParts'

type Pending = { kind: 'one'; id: string; title: string } | { kind: 'all' } | null

export function TrashPanel() {
  const notes = useAppStore(useShallow(trashedNotes))
  const [pending, setPending] = useState<Pending>(null)
  const s = () => getStore().getState()
  const now = useNow()

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
      <ul aria-label="Trashed notes" className="flex-1 overflow-y-auto px-1.5 pb-2">
        {notes.map((n) => {
          const title = displayTitle(n)
          return (
            <li
              key={n.id}
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
                onClick={() => s().restoreNote(n.id)}
                className="grid size-6 place-items-center rounded text-fg-muted hover:bg-bg-elev hover:text-fg"
              >
                <RotateCcw size={13} />
              </button>
              <button
                type="button"
                aria-label={`Delete ${title} permanently`}
                title="Delete permanently"
                onClick={() => setPending({ kind: 'one', id: n.id, title })}
                className="grid size-6 place-items-center rounded text-fg-muted hover:bg-bg-elev hover:text-danger"
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
          if (pending?.kind === 'one') s().purgeNote(pending.id)
          else s().emptyTrash()
          setPending(null)
        }}
      />
    </>
  )
}
