import * as Dialog from '@radix-ui/react-dialog'
import { useStore } from 'zustand'
import { DialogSurface } from '../../ui/DialogSurface'
import { acceptVoiceConsent, voiceStore } from './voice'

/** Shown before the microphone is first used: speech may leave this device. */
export function VoiceConsentDialog() {
  const open = useStore(voiceStore, (s) => s.consentOpen)
  const close = () => voiceStore.setState({ consentOpen: false })
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="np-overlay fixed inset-0 z-40" />
        <DialogSurface className="fixed left-1/2 top-[20vh] z-50 flex w-[min(400px,calc(100vw-32px))] -translate-x-1/2 flex-col gap-3 rounded-lg border border-border bg-bg-elev p-4 shadow-xl">
          <Dialog.Title className="text-sm font-medium text-fg">Turn on voice typing?</Dialog.Title>
          <Dialog.Description className="text-[12.5px] leading-snug text-fg-muted">
            Your speech may be sent to your browser’s speech service to turn it into text (Google in
            Chrome, Microsoft in Edge, Apple in Safari). Blankleaf never receives your voice, but
            avoid dictating anything private.
          </Dialog.Description>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={close}
              className="rounded-md px-3 py-1.5 text-[12.5px] text-fg-muted hover:bg-bg-hover"
            >
              Not now
            </button>
            <button
              type="button"
              onClick={acceptVoiceConsent}
              className="rounded-md bg-accent px-3 py-1.5 text-[12.5px] text-accent-fg"
            >
              Turn on
            </button>
          </div>
        </DialogSurface>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
