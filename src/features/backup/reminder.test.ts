import { shouldRemindBackup } from './reminder'

const DAY = 86_400_000
const now = 100 * DAY

describe('shouldRemindBackup', () => {
  it.each([
    [null, 0, true, false],
    [null, 7, false, false],
    [null, 7, true, true],
    [now - 6 * DAY, 7, true, false],
    [now - 8 * DAY, 7, true, true],
  ])('last=%s interval=%s notes=%s → %s', (last, interval, hasNotes, expected) => {
    expect(shouldRemindBackup(last, interval, hasNotes, now)).toBe(expected)
  })
})
