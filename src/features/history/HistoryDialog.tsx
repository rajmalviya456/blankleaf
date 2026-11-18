/**
 * Version history for one note: earlier states saved as you type (see db/versionsRepo).
 * Pick one to read it, then restore it; the text it replaces is kept as a version too, and the
 * toast's Undo puts it straight back. A centred dialog on laptops, a bottom sheet on phones.
 */
import * as Dialog from '@radix-ui/react-dialog'
import { History, X } from 'lucide-react'
import { useEffect, useState, type KeyboardEvent } from 'react'
import { useStore } from 'zustand'
import type { BlankleafDB, VersionRow } from '../../db/db'
import { listVersions, saveVersion } from '../../db/versionsRepo'
import { displayTitle } from '../../domain/title'
import { getActiveDb } from '../../store/dataReset'
import { getStore, useAppStore } from '../../store/store'
import { DialogSurface } from '../../ui/DialogSurface'
import { toast } from '../../ui/toast'
import { historyStore } from './historyStore'
import { whenLabel } from './whenLabel'

const firstLine = (text: string) => text.trim().split('\n')[0].slice(0, 80) || '(blank lines)'

/** Save the text a restore replaced, so it can always be found again. */
const keepReplaced = (db: BlankleafDB, noteId: string, text: string) =>
  saveVersion(db, noteId, text, Date.now(), { force: true })

type Entry = { key: string; label: string; content: string; at: number | null }

export function HistoryDialog() {
  const noteId = useStore(historyStore, (s) => s.noteId)
  const note = useAppStore((s) => (noteId ? s.notes[noteId] : undefined))
  // Loaded versions, tagged with the note they belong to (so a stale list never shows) and the
  // time they were read (relative times like "12 min ago" are measured from then).
  const [loaded, setLoaded] = useState<{ noteId: string; list: VersionRow[]; now: number } | null>(
    null,
  )
  const [picked, setPicked] = useState({ noteId: '', index: 0 })
  const close = () => historyStore.getState().close()
  const db = getActiveDb()

  useEffect(() => {
    if (!noteId || !db) return
    let alive = true
    void listVersions(db, noteId).then(
      (list) => alive && setLoaded({ noteId, list, now: Date.now() }),
    )
    return () => {
      alive = false
    }
  }, [noteId, db])
  const versions = loaded && loaded.noteId === noteId ? loaded.list : null
  const pickedIndex = picked.noteId === noteId ? picked.index : 0
  const pick = (index: number) => setPicked({ noteId: noteId ?? '', index })

  const entries: Entry[] = note
    ? [
        { key: 'now', label: 'Now', content: note.content, at: null },
        ...(versions ?? [])
          .filter((v, i) => i > 0 || v.content !== note.content)
          .map((v) => ({
            key: String(v.id),
            label: whenLabel(v.at),
            content: v.content,
            at: v.at,
          })),
      ]
    : []
  const current = entries[Math.min(pickedIndex, entries.length - 1)]

  const restore = () => {
    if (!noteId || !note || !current || current.at === null) return
    const before = note.content
    getStore().getState().updateContent(noteId, current.content)
    close()
    toast(`Restored the version from ${current.label.toLowerCase()}.`, {
      action: { label: 'Undo', run: () => getStore().getState().updateContent(noteId, before) },
    })
    if (db) void keepReplaced(db, noteId, before)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const step = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    pick(Math.max(0, Math.min(entries.length - 1, pickedIndex + step)))
  }

  return (
    <Dialog.Root open={!!noteId && !!note} onOpenChange={(o) => !o && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="np-overlay fixed inset-0 z-40" />
        <DialogSurface
          aria-describedby="history-hint"
          className="fixed left-1/2 top-[8vh] z-50 flex max-h-[80vh] w-[min(760px,calc(100vw-32px))] -translate-x-1/2 flex-col gap-3 rounded-lg border border-border bg-bg-elev p-4 shadow-xl"
        >
          <div className="flex items-center gap-2">
            <History size={16} className="shrink-0 text-fg-muted" />
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-sm font-medium text-fg">Version history</Dialog.Title>
              {note && <p className="truncate text-[12px] text-fg-muted">{displayTitle(note)}</p>}
            </div>
            <Dialog.Close
              aria-label="Close"
              className="grid size-7 place-items-center rounded-md text-fg-muted hover:bg-bg-hover hover:text-fg"
            >
              <X size={15} />
            </Dialog.Close>
          </div>

          <div className="grid min-h-0 flex-1 gap-3 sm:grid-cols-[220px_1fr]">
            <div
              role="listbox"
              aria-label="Versions"
              tabIndex={0}
              onKeyDown={onKeyDown}
              aria-activedescendant={current ? `version-${current.key}` : undefined}
              className="flex max-h-48 flex-col gap-0.5 overflow-y-auto rounded-md border border-border p-1 outline-none focus-visible:ring-2 focus-visible:ring-accent sm:max-h-none"
            >
              {entries.map((e, i) => (
                <div
                  key={e.key}
                  id={`version-${e.key}`}
                  role="option"
                  aria-selected={i === pickedIndex}
                  onClick={() => pick(i)}
                  className="cursor-pointer rounded px-2 py-1.5 text-left aria-selected:bg-accent-soft max-sm:py-2.5"
                >
                  <span className="block text-[12.5px] text-fg">{e.label}</span>
                  <span className="block truncate text-[11.5px] text-fg-muted">
                    {firstLine(e.content)}
                  </span>
                </div>
              ))}
              {versions?.length === 0 && (
                <p className="px-2 py-1.5 text-[12px] text-fg-muted">
                  No earlier versions yet. They’re saved every few minutes while you write.
                </p>
              )}
              {!db && (
                <p className="px-2 py-1.5 text-[12px] text-fg-muted">
                  Version history needs browser storage, which isn’t available here.
                </p>
              )}
            </div>
            <pre
              aria-label="Version text"
              tabIndex={0}
              className="min-h-32 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-bg p-3 font-mono text-[12.5px] leading-relaxed text-fg"
            >
              {current?.content}
            </pre>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <p id="history-hint" className="mr-auto text-[11.5px] text-fg-faint">
              Saved every few minutes while you write · the latest 50 are kept, on this device only.
            </p>
            <button
              type="button"
              disabled={!current || current.at === null}
              onClick={restore}
              className="rounded-md bg-accent px-3 py-1.5 text-[12.5px] text-accent-fg disabled:opacity-40 max-sm:min-h-11"
            >
              Restore this version
            </button>
          </div>
        </DialogSurface>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
