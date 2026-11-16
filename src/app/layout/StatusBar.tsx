import { AlertTriangle, Check, Loader } from 'lucide-react'
import { useDeferredValue } from 'react'
import type { Note } from '../../domain/types'
import { lineColAt, textStats } from '../../lib/textStats'
import { activeNote } from '../../store/selectors'
import { useAppStore } from '../../store/store'

/** Above this size, skip word counting so typing stays smooth. */
const WORD_COUNT_LIMIT = 2_000_000

function languageLabel(note: Note): string {
  if (note.language === 'auto' || note.language === 'plaintext')
    return note.mode === 'markdown' ? 'Markdown' : 'Plain text'
  return note.language
}

function SaveState() {
  const status = useAppStore((s) => s.ui.saveStatus)
  const error = useAppStore((s) => s.ui.saveError)
  if (status === 'saving')
    return (
      <span className="flex items-center gap-1">
        <Loader size={11} className="animate-spin" />
        Saving…
      </span>
    )
  if (status === 'error')
    return (
      <span className="flex items-center gap-1 text-danger">
        <AlertTriangle size={11} />
        <span title={error ?? undefined}>Not saved</span>
      </span>
    )
  return (
    <span className="flex items-center gap-1">
      <Check size={11} className="text-ok" />
      Saved
    </span>
  )
}

function NoteInfo({ note }: { note: Note }) {
  const head = useAppStore((s) => s.session.perTab[note.id]?.head ?? 0)
  const content = useDeferredValue(note.content)
  const { line, col } = lineColAt(content, head)
  const big = content.length > WORD_COUNT_LIMIT
  const { words, chars } = big ? { words: 0, chars: content.length } : textStats(content)
  return (
    <>
      <span>{languageLabel(note)}</span>
      <span>
        Ln {line}, Col {col}
      </span>
      <span>
        {!big && `${words.toLocaleString()} words · `}
        {chars.toLocaleString()} chars
      </span>
      <span>Wrap: {note.wrap ? 'on' : 'off'}</span>
    </>
  )
}

export function StatusBar() {
  const note = useAppStore(activeNote)
  return (
    <footer
      role="status"
      aria-label="Status bar"
      className="flex h-6 shrink-0 items-center gap-4 border-t border-border bg-bg-sunken px-3 text-[11px] text-fg-faint tabular-nums"
    >
      {note && <NoteInfo note={note} />}
      <span className="ml-auto">
        <SaveState />
      </span>
    </footer>
  )
}
