/**
 * Lets the system Back button / gesture close phone overlays. Every overlay opened pushes one
 * history entry; Back pops it and closes that overlay. Closing from the UI removes the entry we
 * pushed. Only entries this hook pushed are ever removed, so share links and normal browser
 * navigation are untouched (entries left over by a reload are stepped over). Unmounting (switching to the laptop layout) closes everything.
 *
 * Closing one overlay and opening another in the same moment (Library → Settings) reuses the
 * closed overlay's entry instead of going back and pushing again: history.go() is async, and a
 * late Back would otherwise close the overlay that just opened.
 */
import { useEffect } from 'react'
import { phoneStore } from './phoneStore'

export function useBackToClose(): void {
  useEffect(() => {
    let pushed = 0 // our entries currently in history
    let pendingBack = 0 // entries to remove once this tick settles
    let fromPop = false
    let ignorePops = 0
    let timer: ReturnType<typeof setTimeout> | undefined

    // A reload with a sheet open leaves our entries in history with nothing open: step back
    // over them, or the next Back press would do nothing visible.
    const stale = (history.state as { npOverlay?: unknown } | null)?.npOverlay
    if (typeof stale === 'number' && stale > 0) {
      ignorePops++
      history.go(-stale)
    }

    const flush = () => {
      timer = undefined
      if (pendingBack <= 0) return
      ignorePops++
      history.go(-pendingBack)
      pushed -= pendingBack
      pendingBack = 0
    }

    const unsubscribe = phoneStore.subscribe((s) => {
      const depth = s.stack.length
      const live = pushed - pendingBack // entries that still belong to open overlays
      if (depth > live) {
        let grow = depth - live
        const reuse = Math.min(pendingBack, grow)
        pendingBack -= reuse
        grow -= reuse
        for (; grow > 0; grow--) history.pushState({ npOverlay: ++pushed }, '')
      } else if (depth < live) {
        const extra = live - depth
        if (fromPop) {
          pushed -= extra
          return
        }
        pendingBack += extra
        timer ??= setTimeout(flush, 0)
      }
    })

    const onPop = () => {
      if (ignorePops > 0) {
        ignorePops--
        return
      }
      if (pushed - pendingBack <= 0) return
      fromPop = true
      phoneStore.getState().close()
      fromPop = false
    }
    window.addEventListener('popstate', onPop)

    return () => {
      unsubscribe()
      window.removeEventListener('popstate', onPop)
      clearTimeout(timer)
      if (phoneStore.getState().stack.length) phoneStore.getState().closeAll()
      if (pushed > 0) history.go(-pushed)
    }
  }, [])
}
