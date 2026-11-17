import { useIsPhone } from '../lib/media'
import { X } from 'lucide-react'
import { useEffect } from 'react'
import { useStore } from 'zustand'
import { toastStore, type ToastItem } from './toast'

const toneClass: Record<ToastItem['tone'], string> = {
  info: 'border-border',
  warn: 'border-warn/60',
  error: 'border-danger/60',
}

function ToastView({ t }: { t: ToastItem }) {
  const dismiss = () => toastStore.getState().dismiss(t.id)
  useEffect(() => {
    if (!t.durationMs) return
    const timer = setTimeout(dismiss, t.durationMs)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.id, t.durationMs])

  return (
    <div
      role={t.tone === 'error' ? 'alert' : 'status'}
      className={`pointer-events-auto flex max-w-sm items-start gap-3 rounded-lg border bg-bg-elev px-3 py-2.5 text-[12.5px] text-fg shadow-lg ${toneClass[t.tone]}`}
    >
      <p className="flex-1 leading-snug">{t.msg}</p>
      {t.action && (
        <button
          type="button"
          onClick={() => {
            t.action?.run()
            dismiss()
          }}
          className="shrink-0 font-medium text-accent hover:underline max-sm:-my-2 max-sm:min-h-11 max-sm:px-2"
        >
          {t.action.label}
        </button>
      )}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={dismiss}
        className="shrink-0 text-fg-faint hover:text-fg"
      >
        <X size={13} />
      </button>
    </div>
  )
}

/** Bottom-right stack of toasts. Mount once at the app root. */
export function Toaster() {
  const toasts = useStore(toastStore, (s) => s.toasts)
  // Phones: full width, above the toolbar and the on-screen keyboard.
  const phone = useIsPhone()
  return (
    <div
      data-toaster
      className={
        phone
          ? 'pointer-events-none fixed inset-x-3 bottom-[calc(var(--kb,0px)+56px+env(safe-area-inset-bottom))] z-50 flex flex-col items-stretch gap-2'
          : 'pointer-events-none fixed bottom-9 right-3 z-50 flex flex-col items-end gap-2'
      }
    >
      {toasts.map((t) => (
        <ToastView key={t.id} t={t} />
      ))}
    </div>
  )
}
