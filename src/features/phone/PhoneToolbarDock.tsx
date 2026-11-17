/**
 * The editor toolbar on phones: compact (note actions live in the note menu), docked just above
 * the on-screen keyboard, horizontally scrollable with fading edges and a "More tools" hint.
 */
import { ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Toolbar } from '../toolbar/Toolbar'

export function PhoneToolbarDock({ noteId }: { noteId: string }) {
  const box = useRef<HTMLDivElement>(null)
  const [more, setMore] = useState(false)

  useEffect(() => {
    const row = box.current?.querySelector<HTMLElement>('[role="toolbar"]')
    if (!row) return
    const check = () => setMore(row.scrollWidth - row.scrollLeft - row.clientWidth > 4)
    check()
    row.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    return () => {
      row.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
  }, [noteId])

  return (
    <div
      ref={box}
      className="np-toolbar-dock relative shrink-0 border-t border-border bg-bg pb-[max(0px,calc(env(safe-area-inset-bottom)-var(--kb,0px)))]"
    >
      <Toolbar noteId={noteId} compact />
      {more && (
        <button
          type="button"
          aria-label="More tools"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const row = box.current?.querySelector<HTMLElement>('[role="toolbar"]')
            row?.scrollBy({ left: row.clientWidth * 0.8, behavior: 'smooth' })
          }}
          className="absolute right-0 top-0 grid h-11 w-11 place-items-center bg-gradient-to-l from-bg via-bg to-transparent text-fg-muted"
        >
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  )
}
