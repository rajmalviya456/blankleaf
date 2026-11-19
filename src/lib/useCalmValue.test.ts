import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { calmDelay, useCalmValue } from './useCalmValue'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useCalmValue', () => {
  it('passes small text straight through', () => {
    const { result, rerender } = renderHook(({ v }) => useCalmValue(v), {
      initialProps: { v: 'a' },
    })
    rerender({ v: 'ab' })
    expect(result.current).toBe('ab')
  })

  it('holds large text until typing pauses', () => {
    const big = 'x'.repeat(100_000)
    const { result, rerender } = renderHook(({ v }) => useCalmValue(v), {
      initialProps: { v: big },
    })
    expect(result.current).toBe(big)
    for (let i = 1; i <= 5; i++) {
      rerender({ v: big + 'y'.repeat(i) })
      act(() => void vi.advanceTimersByTime(50))
    }
    expect(result.current).toBe(big)
    act(() => void vi.advanceTimersByTime(calmDelay(big.length)))
    expect(result.current).toBe(big + 'yyyyy')
  })

  it('waits longer for bigger notes, within limits', () => {
    expect(calmDelay(1_000)).toBe(0)
    expect(calmDelay(50_000)).toBeGreaterThan(0)
    expect(calmDelay(250_000)).toBeGreaterThan(calmDelay(50_000))
    expect(calmDelay(5_000_000)).toBeLessThanOrEqual(800)
  })
})
