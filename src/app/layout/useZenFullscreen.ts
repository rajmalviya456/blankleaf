import { useEffect, useRef } from 'react'
import { getStore, useAppStore } from '../../store/store'

/**
 * Laptop zen fills the screen: entering it asks the browser for full screen, turning it off
 * leaves full screen, and leaving full screen (Esc, the browser's own controls) leaves zen.
 */
export function useZenFullscreen(enabled: boolean): void {
  const zen = useAppStore((s) => s.session.zen)
  const ours = useRef(false)

  useEffect(() => {
    if (!enabled || !document.fullscreenEnabled) return
    if (zen && !document.fullscreenElement) {
      ours.current = true
      document.documentElement
        .requestFullscreen?.()
        .then(() => {
          // Zen was turned off while the browser was still going full screen.
          if (!getStore().getState().session.zen && document.fullscreenElement) {
            ours.current = false
            void document.exitFullscreen().catch(() => {})
          }
        })
        .catch(() => {
          ours.current = false
        })
    } else if (!zen && ours.current) {
      ours.current = false
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    }
  }, [zen, enabled])

  useEffect(() => {
    if (!enabled) return
    const onChange = () => {
      if (document.fullscreenElement || !ours.current) return
      ours.current = false
      if (getStore().getState().session.zen) getStore().getState().toggleZen()
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [enabled])
}
