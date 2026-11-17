/**
 * Lets the system Back button / gesture close phone overlays. Every overlay opened pushes one
 * history entry; Back pops it and closes that overlay. Closing from the UI removes the entry we
 * pushed. Only entries this hook pushed are ever removed, so share links and normal browser
 * navigation are untouched. Unmounting (switching to the laptop layout) closes everything.
 */
import { useEffect } from 'react'
import { phoneStore } from './phoneStore'

export function useBackToClose(): void {
  useEffect(() => {
    let pushed = 0
    let fromPop = false
    let ignorePops = 0

    const unsubscribe = phoneStore.subscribe((s) => {
      const depth = s.stack.length
      if (depth > pushed) {
        for (; pushed < depth; pushed++) history.pushState({ npOverlay: pushed + 1 }, '')
      } else if (depth < pushed) {
        const extra = pushed - depth
        pushed = depth
        if (fromPop) return
        ignorePops++
        history.go(-extra)
      }
    })

    const onPop = () => {
      if (ignorePops > 0) {
        ignorePops--
        return
      }
      if (pushed === 0) return
      fromPop = true
      phoneStore.getState().close()
      fromPop = false
    }
    window.addEventListener('popstate', onPop)

    return () => {
      unsubscribe()
      window.removeEventListener('popstate', onPop)
      const extra = pushed
      if (phoneStore.getState().stack.length) phoneStore.getState().closeAll()
      if (extra > 0) history.go(-extra)
    }
  }, [])
}
