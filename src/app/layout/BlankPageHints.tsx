import { ArrowRight } from 'lucide-react'
import { WELCOME_CONTENT } from '../../domain/defaults'
import { displayTitle } from '../../domain/title'
import type { Note } from '../../domain/types'
import type { AppState } from '../../store/store'
import { getStore, useAppStore } from '../../store/store'

const isUntouched = (n: Note) => !n.locked && (!n.content.trim() || n.content === WELCOME_CONTENT)

/** The note edited most recently, other than the one on screen and the Welcome note. */
function lastNoteId(s: AppState, activeId: string): string | null {
  let best: Note | null = null
  for (const n of Object.values(s.notes)) {
    if (n.id === activeId || n.deletedAt !== null || isUntouched(n)) continue
    if (!best || n.updatedAt > best.updatedAt) best = n
  }
  return best?.id ?? null
}

const link =
  'pointer-events-auto rounded px-1.5 py-1 hover:text-fg max-sm:inline-flex max-sm:min-h-11 max-sm:items-center'

/** Quiet links on an untouched page: go back to the last note, or read about Blankleaf. */
export function BlankPageHints({ noteId }: { noteId: string }) {
  const show = useAppStore((s) => {
    const n = s.notes[noteId]
    return !!n && !s.session.zen && isUntouched(n)
  })
  const blank = useAppStore((s) => !s.notes[noteId]?.content.trim())
  const lastId = useAppStore((s) => (blank ? lastNoteId(s, noteId) : null))
  const lastTitle = useAppStore((s) => {
    const n = lastId ? s.notes[lastId] : undefined
    return n ? displayTitle(n) : null
  })
  if (!show) return null
  const base = import.meta.env.BASE_URL
  return (
    <nav
      aria-label="Get started"
      className="pointer-events-none absolute inset-x-0 bottom-2 z-10 flex flex-wrap items-center justify-center gap-x-2 px-3 text-[12px] text-fg-muted"
    >
      {lastId && lastTitle && (
        <button
          type="button"
          onClick={() => {
            const s = getStore().getState()
            s.openNote(lastId)
            s.closeTab(noteId)
          }}
          className={`${link} inline-flex max-w-64 items-center gap-1 bg-bg/90`}
        >
          <span className="truncate">Continue “{lastTitle}”</span>
          <ArrowRight size={13} className="shrink-0" aria-hidden />
        </button>
      )}
      <a className={`${link} bg-bg/90`} href={`${base}features/`} target="_blank" rel="noopener">
        Features
      </a>
      <a className={`${link} bg-bg/90`} href={`${base}faq/`} target="_blank" rel="noopener">
        FAQ
      </a>
    </nav>
  )
}
