/**
 * Height (px) of the layout viewport currently covered by the on-screen keyboard, from the
 * Visual Viewport API. 0 when the keyboard is closed or the API is missing.
 */
import { useSyncExternalStore } from 'react'

function inset(): number {
  const vv = window.visualViewport
  if (!vv) return 0
  return Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))
}

export function useKeyboardInset(): number {
  return useSyncExternalStore(
    (cb) => {
      const vv = window.visualViewport
      if (!vv) return () => {}
      vv.addEventListener('resize', cb)
      vv.addEventListener('scroll', cb)
      return () => {
        vv.removeEventListener('resize', cb)
        vv.removeEventListener('scroll', cb)
      }
    },
    inset,
    () => 0,
  )
}
