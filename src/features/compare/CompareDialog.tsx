/**
 * Compare a note's current text with an earlier version or another note: side by side with the
 * changes marked on laptops, one combined view (removed lines shown in place) on phones.
 */
import { getChunks, MergeView, unifiedMergeView } from '@codemirror/merge'
import { EditorState, type Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import * as Dialog from '@radix-ui/react-dialog'
import { GitCompare, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from 'zustand'
import { displayTitle } from '../../domain/title'
import { useIsPhone } from '../../lib/media'
import { useAppStore } from '../../store/store'
import { DialogSurface } from '../../ui/DialogSurface'
import { calmEditorTheme } from '../editor/theme'
import { compareStore, type CompareSide } from './compareStore'

const readOnly: Extension = [
  EditorState.readOnly.of(true),
  EditorView.editable.of(false),
  EditorView.lineWrapping,
  calmEditorTheme,
]

const changes = (n: number) =>
  n === 0 ? 'No differences' : `${n} ${n === 1 ? 'change' : 'changes'}`

/** Mounts the comparison into a div; reports how many changed blocks there are. */
function Differences({
  before,
  after,
  combined,
  onCount,
}: {
  before: string
  after: string
  combined: boolean
  onCount(n: number): void
}) {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const parent = host.current
    if (!parent) return
    if (combined) {
      const view = new EditorView({
        parent,
        state: EditorState.create({
          doc: after,
          extensions: [readOnly, unifiedMergeView({ original: before, mergeControls: false })],
        }),
      })
      onCount(getChunks(view.state)?.chunks.length ?? 0)
      return () => view.destroy()
    }
    const view = new MergeView({
      parent,
      a: { doc: before, extensions: readOnly },
      b: { doc: after, extensions: readOnly },
      collapseUnchanged: { margin: 3, minSize: 6 },
    })
    onCount(view.chunks.length)
    return () => view.destroy()
  }, [before, after, combined, onCount])
  return (
    <div
      ref={host}
      role="region"
      aria-label="Differences"
      className="np-compare min-h-0 flex-1 overflow-auto rounded-md border border-border bg-bg"
    />
  )
}

/** The other notes, to compare the current one with. */
function NotePicker({ noteId }: { noteId: string }) {
  const notes = useAppStore((s) => s.notes)
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const options = Object.values(notes)
    .filter((n) => n.id !== noteId && n.deletedAt === null && !n.locked)
    .filter((n) => !q || displayTitle(n).toLowerCase().includes(q))
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 100)
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Find a note to compare with…"
        aria-label="Find a note"
        className="h-9 rounded-md border border-border bg-bg px-2.5 text-[13px] text-fg outline-none focus:border-accent"
      />
      <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-border p-1">
        {options.length === 0 && (
          <p className="px-2 py-1.5 text-[12.5px] text-fg-muted">No other notes to compare with.</p>
        )}
        {options.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() =>
              compareStore.getState().pick({ label: displayTitle(n), text: n.content })
            }
            className="block min-h-9 w-full truncate rounded px-2 py-1.5 text-left text-[13px] text-fg hover:bg-bg-hover"
          >
            {displayTitle(n)}
          </button>
        ))}
      </div>
    </div>
  )
}

export function CompareDialog() {
  const noteId = useStore(compareStore, (s) => s.noteId)
  const other = useStore(compareStore, (s) => s.other)
  const note = useAppStore((s) => (noteId ? s.notes[noteId] : undefined))
  const phone = useIsPhone()
  // The count belongs to one comparison, so a new one never shows the last one's count.
  const [counted, setCounted] = useState<{ of: unknown; n: number } | null>(null)
  const count = counted && counted.of === other ? counted.n : null
  const onCount = useCallback((n: number) => setCounted({ of: other, n }), [other])
  const close = () => compareStore.getState().close()

  return (
    <Dialog.Root open={!!note} onOpenChange={(o) => !o && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="np-overlay fixed inset-0 z-40" />
        <DialogSurface
          aria-describedby={undefined}
          className="fixed left-1/2 top-[6vh] z-50 flex h-[84vh] w-[min(1100px,calc(100vw-24px))] -translate-x-1/2 flex-col gap-3 rounded-lg border border-border bg-bg-elev p-4 shadow-xl"
        >
          <div className="flex items-center gap-2">
            <GitCompare size={16} className="shrink-0 text-fg-muted" />
            <Dialog.Title className="text-sm font-medium text-fg">Compare</Dialog.Title>
            {other && count !== null && (
              <span className="text-[12px] text-fg-muted">{changes(count)}</span>
            )}
            <Dialog.Close
              aria-label="Close"
              className="ml-auto grid size-7 place-items-center rounded-md text-fg-muted hover:bg-bg-hover hover:text-fg"
            >
              <X size={15} />
            </Dialog.Close>
          </div>
          {note && !other && <NotePicker noteId={note.id} />}
          {note && other && (
            <>
              <Labels other={other} current={`${displayTitle(note)} (now)`} combined={phone} />
              <Differences
                before={other.text}
                after={note.content}
                combined={phone}
                onCount={onCount}
              />
            </>
          )}
        </DialogSurface>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function Labels({
  other,
  current,
  combined,
}: {
  other: CompareSide
  current: string
  combined: boolean
}) {
  const label = 'min-w-0 truncate text-[12px] text-fg-muted'
  if (combined)
    return (
      <p className="text-[12px] text-fg-muted">
        <span className="text-danger">− {other.label}</span> ·{' '}
        <span className="text-ok">+ {current}</span>
      </p>
    )
  return (
    <div className="grid grid-cols-2 gap-3">
      <span className={label}>{other.label}</span>
      <span className={label}>{current}</span>
    </div>
  )
}
