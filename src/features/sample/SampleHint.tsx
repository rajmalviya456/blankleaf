import { Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { getStore, useAppStore } from '../../store/store'
import { hideSampleHint, openSample, sampleHintHidden } from './sample'

/** Below this many written notes someone is still new, and an empty page offers the sample. */
const NEW_VISITOR_NOTES = 3

/** "Try a sample note", on an empty page, for people who haven't written much yet. */
export function SampleHint({ noteId }: { noteId: string }) {
  const [hidden, setHidden] = useState(sampleHintHidden)
  const empty = useAppStore((s) => s.notes[noteId]?.content === '')
  const newcomer = useAppStore(
    (s) =>
      Object.values(s.notes).filter((n) => n.deletedAt === null && (n.content || n.locked)).length <
      NEW_VISITOR_NOTES,
  )
  if (hidden || !empty || !newcomer) return null
  return (
    <div className="absolute bottom-3 right-3 z-10 flex items-center rounded-full border border-border bg-bg-elev text-[12.5px] text-fg-muted shadow-sm">
      <button
        type="button"
        onClick={() => openSample(getStore())}
        className="flex min-h-8 items-center gap-1.5 rounded-l-full py-1 pl-3 pr-2 hover:bg-bg-hover hover:text-fg"
      >
        <Sparkles size={13} aria-hidden />
        Try a sample note
      </button>
      <button
        type="button"
        aria-label="Hide the sample note offer"
        title="Don't show again"
        onClick={() => {
          hideSampleHint()
          setHidden(true)
        }}
        className="grid min-h-8 w-8 place-items-center rounded-r-full hover:bg-bg-hover hover:text-fg"
      >
        <X size={13} />
      </button>
    </div>
  )
}
