/** Live media-query hooks for the phone layout and touch-only fixes. */
import { useSyncExternalStore } from 'react'

export const PHONE_QUERY = '(max-width: 639px)'
export const TOUCH_QUERY = '(pointer: coarse)'
export const WIDE_QUERY = '(min-width: 900px)'

function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      if (typeof window.matchMedia !== 'function') return () => {}
      const mql = window.matchMedia(query)
      mql.addEventListener('change', cb)
      return () => mql.removeEventListener('change', cb)
    },
    () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches,
    () => false,
  )
}

/** Portrait phone: the phone layout applies. */
export const useIsPhone = (): boolean => useMedia(PHONE_QUERY)
/** Touch screen (any layout): no hover, long-press instead of right-click. */
export const useIsTouch = (): boolean => useMedia(TOUCH_QUERY)

/** Room for two notes side by side. */
export const useIsWide = () => useMedia(WIDE_QUERY)
