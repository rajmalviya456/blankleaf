import { useEffect, useState } from 'react'
import { platform } from '../../lib/platform'
import { useIsPhone } from '../../lib/media'
import { getStore } from '../../store/store'

/** Brief "how to get out" hint shown when zen mode starts. */
export function ZenExitHint() {
  const phone = useIsPhone()
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 1800)
    return () => clearTimeout(t)
  }, [])
  // Phones have no Esc key: keep a tappable way out on screen.
  if (phone)
    return (
      <button
        type="button"
        onClick={() => getStore().getState().toggleZen()}
        className="fixed right-3 top-[calc(env(safe-area-inset-top)+8px)] z-30 h-11 rounded-full border border-border bg-bg-elev/90 px-4 text-[14px] text-fg-muted shadow"
      >
        Exit zen
      </button>
    )
  return (
    <div
      aria-live="polite"
      className={[
        'pointer-events-none fixed left-1/2 top-4 z-30 -translate-x-1/2 rounded-full border border-border bg-bg-elev/90 px-3 py-1 text-[11.5px] text-fg-muted shadow transition-opacity duration-500',
        visible ? 'opacity-100' : 'opacity-0',
      ].join(' ')}
    >
      Press Esc or {platform() === 'mac' ? '⌘.' : 'Ctrl+.'} to exit zen
    </div>
  )
}
