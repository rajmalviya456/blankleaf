import { Mic } from 'lucide-react'
import { useEffect } from 'react'
import { useStore } from 'zustand'
import { useIsPhone } from '../../lib/media'
import { stopVoice, voiceStore } from './voice'

/**
 * While dictating: shows that the microphone is on, the words so far, and a way to stop. It
 * sits in the pane of the note being dictated into.
 */
export function VoiceStatus({ noteId }: { noteId: string }) {
  const listening = useStore(voiceStore, (s) => s.listening && s.noteId === noteId)
  const interim = useStore(voiceStore, (s) => s.interim)
  const phone = useIsPhone()
  useEffect(() => {
    if (phone) stopVoice()
  }, [phone])
  if (!listening) return null
  return (
    <div
      role="status"
      aria-label="Voice typing"
      className="absolute inset-x-0 bottom-3 z-10 mx-auto flex w-fit max-w-[min(560px,calc(100%-24px))] items-center gap-2 rounded-full border border-border bg-bg-elev py-1 pl-3 pr-1 text-[12.5px] text-fg shadow-lg"
    >
      <Mic size={14} className="shrink-0 animate-pulse text-danger" aria-hidden />
      <span className="min-w-0 truncate">{interim || 'Listening…'}</span>
      <button
        type="button"
        onClick={stopVoice}
        aria-label="Stop voice typing"
        className="shrink-0 rounded-full px-2.5 py-1 text-fg-muted hover:bg-bg-hover hover:text-fg"
      >
        Stop
      </button>
    </div>
  )
}
