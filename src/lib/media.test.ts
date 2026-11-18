import { renderHook } from '@testing-library/react'
import { afterEach } from 'vitest'
import { stubMedia } from '../../tests/media'
import { PHONE_QUERY, TOUCH_QUERY, useIsPhone, useIsTouch } from './media'

let media: ReturnType<typeof stubMedia>
afterEach(() => media?.restore())

describe('media hooks', () => {
  it('exposes the queries the design fixes', () => {
    expect(PHONE_QUERY).toBe('(max-width: 639px)')
    expect(TOUCH_QUERY).toBe('(pointer: coarse)')
  })

  it('useIsPhone follows (max-width: 639px) live', () => {
    media = stubMedia({ phone: false })
    const { result } = renderHook(() => useIsPhone())
    expect(result.current).toBe(false)
    media.set({ phone: true })
    expect(result.current).toBe(true)
    media.set({ phone: false })
    expect(result.current).toBe(false)
  })

  it('useIsTouch follows (pointer: coarse)', () => {
    media = stubMedia({ touch: true })
    const { result } = renderHook(() => useIsTouch())
    expect(result.current).toBe(true)
    media.set({ touch: false })
    expect(result.current).toBe(false)
  })
})
