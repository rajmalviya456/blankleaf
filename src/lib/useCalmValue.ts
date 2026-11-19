import { startTransition, useDeferredValue, useEffect, useState } from 'react'

/** Below this many characters the preview keeps up with every keystroke. */
const INSTANT_CHARS = 20_000
const MAX_DELAY_MS = 800

/**
 * How long typing must pause before a large text is shown again: rendering a big note's preview
 * takes long enough to make every keystroke stutter if it ran each time.
 */
export function calmDelay(length: number): number {
  if (length < INSTANT_CHARS) return 0
  return Math.min(MAX_DELAY_MS, 150 + Math.round(length / 1000))
}

/** `value`, but for large text only once it has stopped changing for a moment. */
export function useCalmValue(value: string): string {
  const delay = calmDelay(value.length)
  const [calm, setCalm] = useState(value)
  useEffect(() => {
    if (!delay) return
    // A transition: React can pause a big redraw (the preview's chunks) to handle typing.
    const t = setTimeout(() => startTransition(() => setCalm(value)), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  const deferred = useDeferredValue(value)
  return delay ? calm : deferred
}
