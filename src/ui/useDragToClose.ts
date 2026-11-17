/** Drag a sheet down by its handle to close it; short drags spring back. */
import { useRef, type PointerEvent as ReactPointerEvent } from 'react'

const CLOSE_DISTANCE = 80 // px
const CLOSE_VELOCITY = 0.5 // px/ms

/** The sheet the handle belongs to. */
const sheetOf = (e: ReactPointerEvent) =>
  (e.currentTarget as HTMLElement).closest<HTMLElement>('[data-surface]')

export function useDragToClose(onClose: () => void) {
  const drag = useRef<{ y: number; t: number; dy: number } | null>(null)

  const follow = (e: ReactPointerEvent) => {
    const d = drag.current
    if (!d) return
    d.dy = Math.max(0, e.clientY - d.y)
    const sheet = sheetOf(e)
    if (sheet) sheet.style.transform = `translateY(${d.dy}px)`
  }
  const reset = (e: ReactPointerEvent) => {
    drag.current = null
    const sheet = sheetOf(e)
    if (sheet) sheet.style.transform = ''
  }

  return {
    onPointerDown(e: ReactPointerEvent) {
      drag.current = { y: e.clientY, t: performance.now(), dy: 0 }
      ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    },
    onPointerMove: follow,
    onPointerUp(e: ReactPointerEvent) {
      const d = drag.current
      if (!d) return
      follow(e)
      const elapsed = Math.max(1, performance.now() - d.t)
      const close = d.dy > CLOSE_DISTANCE || (d.dy / elapsed > CLOSE_VELOCITY && d.dy > 40)
      reset(e)
      if (close) onClose()
    },
    onPointerCancel: reset,
  }
}
