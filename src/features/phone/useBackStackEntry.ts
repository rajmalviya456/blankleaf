/**
 * Lets the phone's Back button close any dialog: while `open` on a phone, the dialog sits on the
 * overlay stack; Back takes it off and calls `close`. Closing it any other way takes it off the
 * stack. Does nothing on laptops.
 */
import { useEffect, useId, useRef } from 'react'
import { useIsPhone } from '../../lib/media'
import { phoneStore, type PhoneOverlay } from './phoneStore'

export function useBackStackEntry(open: boolean, close: () => void): void {
  const phone = useIsPhone()
  const id = useId()
  const closeRef = useRef(close)
  useEffect(() => {
    closeRef.current = close
  })

  useEffect(() => {
    if (!phone || !open) return
    const entry: PhoneOverlay = { kind: 'layer', id }
    const p = phoneStore.getState()
    p.open(entry)
    const has = (stack: PhoneOverlay[]) =>
      stack.some((o) => typeof o === 'object' && o.kind === 'layer' && o.id === id)
    let mine = true
    const unsubscribe = phoneStore.subscribe((s) => {
      if (mine && !has(s.stack)) {
        mine = false
        closeRef.current()
      }
    })
    return () => {
      unsubscribe()
      if (mine) phoneStore.getState().remove(entry)
    }
  }, [phone, open, id])
}
