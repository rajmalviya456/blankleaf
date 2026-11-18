/** Controllable window.matchMedia for tests: stubMedia({ phone: true }) then set({ phone: false }). */
import { act } from '@testing-library/react'

type Flags = { phone?: boolean; touch?: boolean; wide?: boolean }
const PHONE = '(max-width: 639px)'
const TOUCH = '(pointer: coarse)'
const WIDE = '(min-width: 900px)'

export function stubMedia(initial: Flags = {}) {
  let flags: Flags = { ...initial }
  const listeners = new Map<string, Set<(e: MediaQueryListEvent) => void>>()
  const matches = (q: string) =>
    q === PHONE ? !!flags.phone : q === TOUCH ? !!flags.touch : q === WIDE ? !!flags.wide : false
  const original = window.matchMedia
  window.matchMedia = ((query: string) => {
    const set = listeners.get(query) ?? new Set()
    listeners.set(query, set)
    return {
      get matches() {
        return matches(query)
      },
      media: query,
      onchange: null,
      addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => set.add(cb),
      removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => set.delete(cb),
      addListener: (cb: (e: MediaQueryListEvent) => void) => set.add(cb),
      removeListener: (cb: (e: MediaQueryListEvent) => void) => set.delete(cb),
      dispatchEvent: () => true,
    } as unknown as MediaQueryList
  }) as typeof window.matchMedia
  return {
    set(next: Flags) {
      flags = { ...flags, ...next }
      act(() => {
        for (const [q, set] of listeners)
          set.forEach((cb) => cb({ matches: matches(q), media: q } as MediaQueryListEvent))
      })
    },
    restore() {
      window.matchMedia = original
    },
  }
}
