/**
 * Priority overflow for the laptop toolbar: when its tools don't fit on one row, the least used
 * groups fold, one at a time, into a "More tools" menu; when there's room again they unfold.
 * Widths come from the page itself, so this follows the window, the sidebar, the note's format
 * and the interface size alike.
 */
import { useLayoutEffect, useRef, useState, type RefObject } from 'react'

/** Unfolding needs this much to spare, so a toolbar right at the edge doesn't flip-flop. */
const SPARE = 2

/**
 * How many groups to fold next. `natural` is the width the tools need as they are now, `room`
 * the toolbar's width, and `freed[n]` how much folding group n saved when it was last folded.
 */
export function nextFold(p: {
  fold: number
  max: number
  natural: number
  room: number
  freed: (number | undefined)[]
}): number {
  const fold = Math.min(p.fold, p.max)
  if (p.natural > p.room + 0.5) return Math.min(fold + 1, p.max)
  const back = p.freed[fold]
  if (fold > 0 && back !== undefined && p.natural + back <= p.room - SPARE) return fold - 1
  return fold
}

/** The width the toolbar's tools need: its scroll width, less any stretch in the spacer. */
function naturalWidth(bar: HTMLElement): number {
  const spacer = bar.querySelector<HTMLElement>(':scope > [data-spacer]')
  if (!spacer) return bar.scrollWidth
  const stretch =
    spacer.getBoundingClientRect().width - (parseFloat(getComputedStyle(spacer).minWidth) || 0)
  return bar.scrollWidth - Math.max(0, stretch)
}

/**
 * The number of groups folded away in `bar`, from 0 up to `max`. `content` names what the bar
 * shows (the note and its format): when it changes, widths are measured afresh.
 */
export function useFold(bar: RefObject<HTMLElement | null>, max: number, content: string): number {
  const [fold, setFold] = useState(0)
  // freed[n]: room folding group n gave; last: the previous measurement, to work that out.
  const memory = useRef<{
    freed: (number | undefined)[]
    last: { fold: number; natural: number; content: string } | null
  }>({ freed: [], last: null })

  // Before paint, after each change of what's shown: no flash of a toolbar that doesn't fit.
  useLayoutEffect(() => {
    const el = bar.current
    if (!el) return
    const check = () => {
      if (!el.clientWidth) return // not laid out (hidden, or a test without layout)
      const f = Math.min(fold, max)
      const natural = naturalWidth(el)
      const m = memory.current
      // Folding one more group just happened: remember how much room that gave.
      if (m.last && m.last.content === content && m.last.fold === f - 1 && m.last.natural > natural)
        m.freed[f] = m.last.natural - natural
      m.last = { fold: f, natural, content }
      const next = nextFold({ fold: f, max, natural, room: el.clientWidth, freed: m.freed })
      if (next !== fold) setFold(next)
    }
    check()
    if (typeof ResizeObserver === 'undefined') return
    const watcher = new ResizeObserver(check)
    watcher.observe(el)
    return () => watcher.disconnect()
  }, [bar, max, content, fold])

  return Math.min(fold, max)
}
