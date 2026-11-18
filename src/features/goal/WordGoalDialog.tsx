/** Set a word target for one note. A centred dialog on laptops, a bottom sheet on phones. */
import * as Dialog from '@radix-ui/react-dialog'
import { useState, type FormEvent } from 'react'
import { useStore } from 'zustand'
import { cleanWordGoal } from '../../domain/wordGoal'
import { textStats } from '../../lib/textStats'
import { getStore, useAppStore } from '../../store/store'
import { DialogSurface } from '../../ui/DialogSurface'
import { goalStore } from './goalStore'

function Form({ noteId }: { noteId: string }) {
  const goal = useAppStore((s) => s.notes[noteId]?.wordGoal)
  const words = useAppStore((s) => textStats(s.notes[noteId]?.content ?? '').words)
  const [value, setValue] = useState(goal ? String(goal) : '')
  const close = () => goalStore.getState().close()
  const parsed = cleanWordGoal(Number(value))
  const invalid = value.trim() !== '' && parsed === undefined

  const save = (e: FormEvent) => {
    e.preventDefault()
    if (invalid) return
    getStore().getState().setWordGoal(noteId, parsed)
    close()
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-3">
      <Dialog.Title className="text-sm font-medium text-fg">Word goal</Dialog.Title>
      <Dialog.Description className="text-[12.5px] text-fg-muted">
        This note has {words.toLocaleString()} {words === 1 ? 'word' : 'words'} so far.
      </Dialog.Description>
      <div className="flex flex-col gap-1 text-[12.5px] text-fg-muted">
        <label htmlFor="word-goal">Target words</label>
        <input
          id="word-goal"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={value}
          aria-invalid={invalid}
          aria-describedby={invalid ? 'word-goal-error' : undefined}
          onChange={(e) => setValue(e.target.value)}
          className="h-9 rounded-md border border-border bg-bg px-2.5 text-[13px] text-fg outline-none focus:border-accent max-sm:h-11 max-sm:text-[16px]"
          autoFocus
        />
        {invalid && (
          <span id="word-goal-error" className="text-danger">
            Enter a whole number from 1 to 1,000,000.
          </span>
        )}
      </div>
      <div className="flex justify-end gap-2">
        {goal !== undefined && (
          <button
            type="button"
            onClick={() => {
              getStore().getState().setWordGoal(noteId, undefined)
              close()
            }}
            className="mr-auto rounded-md px-3 py-1.5 text-[12.5px] text-fg-muted hover:bg-bg-hover max-sm:min-h-11"
          >
            Remove goal
          </button>
        )}
        <button
          type="button"
          onClick={close}
          className="rounded-md px-3 py-1.5 text-[12.5px] text-fg-muted hover:bg-bg-hover max-sm:min-h-11"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={invalid}
          className="rounded-md bg-accent px-3 py-1.5 text-[12.5px] text-accent-fg disabled:opacity-40 max-sm:min-h-11"
        >
          Save
        </button>
      </div>
    </form>
  )
}

export function WordGoalDialog() {
  const noteId = useStore(goalStore, (s) => s.noteId)
  const exists = useAppStore((s) => !!(noteId && s.notes[noteId]))
  return (
    <Dialog.Root
      open={exists}
      onOpenChange={(o) => {
        if (!o) goalStore.getState().close()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="np-overlay fixed inset-0 z-40" />
        <DialogSurface className="fixed left-1/2 top-[20vh] z-50 w-[min(360px,calc(100vw-32px))] -translate-x-1/2 rounded-lg border border-border bg-bg-elev p-4 shadow-xl">
          {noteId && <Form key={noteId} noteId={noteId} />}
        </DialogSurface>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
