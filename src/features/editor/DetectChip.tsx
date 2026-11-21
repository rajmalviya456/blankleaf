import { X } from 'lucide-react'
import { useEffect } from 'react'
import { useStore } from 'zustand'
import { languageMeta } from '../../domain/languages'
import { getStore, useAppStore } from '../../store/store'
import { detectStore } from './detectStore'

/** How long "Detected Python" stays up when nobody touches it. */
const SHOW_MS = 10_000

/** "Detected Python · Undo": a wrong guess takes one click to fix. */
export function DetectChip({ noteId }: { noteId: string }) {
  const detected = useStore(detectStore, (s) => s.detected)
  const language = useAppStore((s) => s.notes[noteId]?.language)
  const current = !!detected && detected.noteId === noteId && detected.language === language

  useEffect(() => {
    if (!current) return
    const t = setTimeout(() => detectStore.getState().clear(), SHOW_MS)
    return () => clearTimeout(t)
  }, [current])

  if (!current) return null
  const close = () => detectStore.getState().clear()
  return (
    <div
      role="status"
      aria-label="Format detected"
      className="absolute bottom-3 right-3 z-10 flex items-center gap-1 rounded-full border border-border bg-bg-elev py-0.5 pl-3 pr-0.5 text-[12.5px] text-fg-muted shadow-sm"
    >
      <span>
        Detected{' '}
        <span className="font-medium text-fg">{languageMeta(detected.language).label}</span>
      </span>
      <button
        type="button"
        aria-label="Undo: make this plain text"
        onClick={() => {
          getStore().getState().setLanguage(noteId, 'plaintext')
          close()
        }}
        className="min-h-7 rounded-full px-2 text-accent hover:bg-bg-hover"
      >
        Undo
      </button>
      <button
        type="button"
        aria-label="Close"
        onClick={close}
        className="grid size-7 place-items-center rounded-full hover:bg-bg-hover hover:text-fg"
      >
        <X size={13} />
      </button>
    </div>
  )
}
