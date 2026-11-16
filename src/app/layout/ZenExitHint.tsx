import { useEffect, useState } from 'react'
import { platform } from '../../lib/platform'

/** Brief "how to get out" hint shown when zen mode starts. */
export function ZenExitHint() {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 1800)
    return () => clearTimeout(t)
  }, [])
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
