import { X } from 'lucide-react'
import { useMemo } from 'react'
import { useStore } from 'zustand'
import { LONG_SENTENCE, readability } from '../../domain/readability'
import { useCalmValue } from '../../lib/useCalmValue'
import { useAppStore } from '../../store/store'
import { readabilityStore } from './readabilityStore'

const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`

/** How easy the open note is to read, updated as you write. */
export function ReadabilityPanel({ noteId }: { noteId: string }) {
  const openFor = useStore(readabilityStore, (s) => s.noteId)
  const highlight = useStore(readabilityStore, (s) => s.highlight)
  const content = useCalmValue(useAppStore((s) => s.notes[noteId]?.content ?? ''))
  const open = openFor === noteId
  const r = useMemo(() => (open ? readability(content) : null), [open, content])
  if (!open || !r) return null
  const perSentence = r.sentences ? Math.round(r.words / r.sentences) : 0
  return (
    <section
      aria-label="Readability"
      className="absolute bottom-3 left-3 z-10 w-[min(300px,calc(100%-24px))] rounded-lg border border-border bg-bg-elev p-3 text-[12.5px] text-fg-muted shadow-lg"
    >
      <div className="mb-2 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-fg">
            {!r.words
              ? 'Nothing to read yet'
              : r.english
                ? `Grade ${Math.round(r.grade)} · ${r.label}`
                : 'Grade: English text only'}
          </p>
          {r.words > 0 && r.english && <p>Reading ease {r.ease} / 100</p>}
        </div>
        <button
          type="button"
          aria-label="Close readability"
          onClick={() => readabilityStore.getState().close()}
          className="grid size-6 place-items-center rounded hover:bg-bg-hover hover:text-fg"
        >
          <X size={13} />
        </button>
      </div>
      {r.words > 0 && (
        <>
          <p>
            {plural(r.words, 'word')} · {plural(r.sentences, 'sentence')} · {perSentence} words a
            sentence
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="flex-1">
              {plural(r.longSentences.length, 'long sentence')}{' '}
              <span className="text-fg-faint">(over {LONG_SENTENCE} words)</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={highlight}
              aria-label="Highlight long sentences"
              onClick={() => readabilityStore.getState().setHighlight(!highlight)}
              className="relative h-5 w-9 shrink-0 rounded-full bg-border transition-colors aria-checked:bg-accent"
            >
              <span
                aria-hidden
                className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-[left] ${highlight ? 'left-[18px]' : 'left-0.5'}`}
              />
            </button>
          </div>
          {r.overused.length > 0 && (
            <div className="mt-2">
              <p className="mb-1">Used a lot:</p>
              <ul className="flex flex-wrap gap-1">
                {r.overused.map((o) => (
                  <li key={o.word} className="rounded bg-bg-hover px-1.5 py-0.5 text-fg">
                    {o.word} ×{o.count}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  )
}
