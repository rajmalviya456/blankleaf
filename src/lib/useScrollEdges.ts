/**
 * Which ends of a sideways-scrolling row have more content hidden past them: 'start', 'end',
 * 'both', or undefined when everything fits. Drives a fade at those edges (.np-fade-x).
 */
import { useEffect, useState, type RefObject } from 'react'

export type ScrollEdges = 'start' | 'end' | 'both' | undefined

export function scrollEdges(el: Pick<Element, 'scrollLeft' | 'scrollWidth' | 'clientWidth'>) {
  const start = el.scrollLeft > 1
  const end = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
  return start && end ? 'both' : start ? 'start' : end ? 'end' : undefined
}

export function useScrollEdges(ref: RefObject<HTMLElement | null>): ScrollEdges {
  const [edges, setEdges] = useState<ScrollEdges>(undefined)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setEdges(scrollEdges(el))
    update()
    el.addEventListener('scroll', update, { passive: true })
    // Tabs opening and closing change the width inside; the window changes the width outside.
    const watcher = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    watcher?.observe(el)
    const changes = typeof MutationObserver === 'undefined' ? null : new MutationObserver(update)
    changes?.observe(el, { childList: true, subtree: true, characterData: true })
    return () => {
      el.removeEventListener('scroll', update)
      watcher?.disconnect()
      changes?.disconnect()
    }
  }, [ref])
  return edges
}
