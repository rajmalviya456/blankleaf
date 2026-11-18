/** Add and remove a note's tags. A centred dialog on laptops, a bottom sheet on phones. */
import * as Dialog from '@radix-ui/react-dialog'
import { Plus, X } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useStore } from 'zustand'
import { addTag, noteHasTag, TAG_MAX_LENGTH, tagCounts } from '../../domain/tags'
import { displayTitle } from '../../domain/title'
import { liveNotesSorted } from '../../store/selectors'
import { getStore, useAppStore } from '../../store/store'
import { DialogSurface } from '../../ui/DialogSurface'
import { tagsStore } from './tagsStore'

const chip =
  'inline-flex items-center gap-1 rounded-full bg-accent-soft py-0.5 pl-2.5 pr-1 text-[12.5px] text-fg'

function TagsForm({ noteId }: { noteId: string }) {
  const note = useAppStore((s) => s.notes[noteId])
  const notes = useAppStore(useShallow(liveNotesSorted))
  const [draft, setDraft] = useState('')
  const tags = note?.tags ?? []
  const typed = useRef('')
  useEffect(() => {
    typed.current = draft
  }, [draft])

  // However the dialog closes (Done, Escape, the phone's Back), what was typed is kept.
  useEffect(
    () => () => {
      const s = getStore().getState()
      const current = s.notes[noteId]
      if (current && typed.current.trim())
        s.setNoteTags(noteId, addTag(current.tags ?? [], typed.current))
    },
    [noteId],
  )

  const add = (raw: string) => {
    getStore().getState().setNoteTags(noteId, addTag(tags, raw))
    setDraft('')
  }
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add(draft)
    } else if (e.key === 'Backspace' && !draft && tags.length) {
      getStore().getState().setNoteTags(noteId, tags.slice(0, -1))
    }
  }
  const suggestions = note
    ? tagCounts(notes)
        .map((t) => t.tag)
        .filter((t) => !noteHasTag(note, t))
    : []

  return (
    <>
      <div>
        <Dialog.Title className="text-sm font-medium text-fg">Tags</Dialog.Title>
        {note && <p className="truncate text-[12px] text-fg-muted">{displayTitle(note)}</p>}
      </div>
      {tags.length > 0 && (
        <ul aria-label="Tags on this note" className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <li key={t} className={chip}>
              <span className="max-w-56 truncate">{t}</span>
              <button
                type="button"
                aria-label={`Remove tag ${t}`}
                onClick={() =>
                  getStore()
                    .getState()
                    .setNoteTags(
                      noteId,
                      tags.filter((x) => x !== t),
                    )
                }
                className="grid size-5 place-items-center rounded-full text-fg-muted hover:bg-bg-hover hover:text-fg max-sm:size-9"
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        type="text"
        aria-label="Add a tag"
        placeholder="Add a tag, then press Enter"
        value={draft}
        maxLength={TAG_MAX_LENGTH + 2}
        enterKeyHint="done"
        onChange={(e) => setDraft(e.target.value.replace(/,/g, ''))}
        onKeyDown={onKeyDown}
        className="h-9 rounded-md border border-border bg-bg px-2.5 text-[13px] text-fg outline-none placeholder:text-fg-faint focus:border-accent max-sm:h-11"
      />
      {suggestions.length > 0 && (
        <div>
          <p className="mb-1 text-[11.5px] text-fg-muted">Your tags</p>
          <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
            {suggestions.map((t) => (
              <button
                key={t}
                type="button"
                aria-label={`Add tag ${t}`}
                onClick={() => add(t)}
                className="inline-flex max-w-full items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-[12.5px] text-fg-muted hover:bg-bg-hover hover:text-fg max-sm:min-h-9"
              >
                <Plus size={11} className="shrink-0" />
                <span className="truncate">{t}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => tagsStore.getState().close()}
          className="rounded-md bg-accent px-3 py-1.5 text-[12.5px] text-accent-fg max-sm:min-h-11 max-sm:px-5"
        >
          Done
        </button>
      </div>
    </>
  )
}

export function TagsDialog() {
  const noteId = useStore(tagsStore, (s) => s.noteId)
  const exists = useAppStore((s) => !!(noteId && s.notes[noteId]))
  return (
    <Dialog.Root
      open={exists}
      onOpenChange={(o) => {
        if (!o) tagsStore.getState().close()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="np-overlay fixed inset-0 z-40" />
        <DialogSurface
          aria-describedby={undefined}
          className="fixed left-1/2 top-[18vh] z-50 flex w-[min(420px,calc(100vw-32px))] -translate-x-1/2 flex-col gap-3 rounded-lg border border-border bg-bg-elev p-4 shadow-xl"
        >
          {noteId && <TagsForm key={noteId} noteId={noteId} />}
        </DialogSurface>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
