import { relativeTime } from './relativeTime'

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR
const now = new Date('2026-11-16T12:00:00').getTime()

describe('relativeTime', () => {
  it.each([
    [now - 10_000, 'just now'],
    [now - 5 * MIN, '5m'],
    [now - 59 * MIN, '59m'],
    [now - 3 * HOUR, '3h'],
    [now - 2 * DAY, '2d'],
    [now - 6 * DAY, '6d'],
  ])('%s → %s', (ts, out) => {
    expect(relativeTime(ts, now)).toBe(out)
  })

  it('uses a short date after a week', () => {
    expect(relativeTime(new Date('2026-11-03T09:00:00').getTime(), now)).toBe('Nov 3')
  })

  it('includes the year for older dates', () => {
    expect(relativeTime(new Date('2025-02-01T09:00:00').getTime(), now)).toBe('Feb 1, 2025')
  })
})
