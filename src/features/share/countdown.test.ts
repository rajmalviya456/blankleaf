import { act, renderHook } from '@testing-library/react'
import { formatCountdown, useCountdown } from './countdown'

describe('formatCountdown', () => {
  it.each([
    [0, '0:00'],
    [-5000, '0:00'],
    [59_000, '0:59'],
    [247_000, '4:07'],
    [3_599_000, '59:59'],
    [3_600_000, '1:00:00'],
    [86_400_000 + 3 * 3_600_000 + 4 * 60_000, '1d 3:04'],
    [2 * 86_400_000, '2d 0:00'],
  ])('%s ms → %s', (ms, out) => expect(formatCountdown(ms)).toBe(out))

  it('rounds partial seconds up so it never shows 0:00 early', () => {
    expect(formatCountdown(500)).toBe('0:01')
  })
})

describe('useCountdown', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('ticks every second and reports expired at 0', () => {
    const start = Date.now()
    const { result } = renderHook(() => useCountdown(start + 3000))
    expect(result.current.label).toBe('0:03')
    act(() => void vi.advanceTimersByTime(1000))
    expect(result.current.label).toBe('0:02')
    act(() => void vi.advanceTimersByTime(2000))
    expect(result.current).toMatchObject({ label: '0:00', expired: true, msLeft: 0 })
  })

  it('restarts from the current time when the target changes', () => {
    const start = Date.now()
    const { result, rerender } = renderHook(({ exp }) => useCountdown(exp), {
      initialProps: { exp: 0 },
    })
    act(() => void vi.advanceTimersByTime(5000))
    rerender({ exp: Date.now() + 247_000 })
    expect(result.current.label).toBe('4:07')
    expect(Date.now() - start).toBe(5000)
  })
})
