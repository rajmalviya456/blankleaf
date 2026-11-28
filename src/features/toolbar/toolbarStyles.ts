/** Class names and helpers the toolbar and its More tools menu share. */
import { getStore } from '../../store/store'
import { toast } from '../../ui/toast'

export const btn =
  'grid h-7 min-w-7 shrink-0 place-items-center rounded-md px-1 text-fg-muted outline-none hover:bg-bg-hover hover:text-fg focus-visible:bg-bg-hover focus-visible:text-fg disabled:pointer-events-none disabled:opacity-35 aria-pressed:bg-accent-soft aria-pressed:text-accent'
export const menuBtn = btn
  .replace('grid ', 'flex ')
  .replace('place-items-center', 'items-center gap-0.5 px-1.5')

/** A menu row; its text colour is added where it's used (normal or danger). */
export const itemBase =
  'flex cursor-default select-none items-center gap-2 rounded px-2 py-1.5 text-[12.5px] outline-none data-[highlighted]:bg-accent-soft data-[disabled]:opacity-40'
export const item = `${itemBase} text-fg`
export const menuContent = 'z-50 min-w-44 rounded-md border border-border bg-bg-elev p-1 shadow-lg'

export async function copyAllText(noteId: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(getStore().getState().notes[noteId]?.content ?? '')
    toast('Copied note text')
  } catch {
    toast('Couldn’t copy — your browser blocked clipboard access.', { tone: 'warn' })
  }
}

/**
 * Where focus goes when a toolbar menu closes: if the chosen action already put it somewhere
 * (the note, at a heading), it stays there; otherwise back to the menu's button, never lost.
 */
export function keepMovedFocus(e: Event): void {
  const now = document.activeElement
  if (now && now !== document.body) e.preventDefault()
}
