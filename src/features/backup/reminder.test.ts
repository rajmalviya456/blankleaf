import { hasWrittenNotes, shouldRemindBackup } from './reminder'
import { DEFAULT_SETTINGS, newNoteDraft, WELCOME_CONTENT } from '../../domain/defaults'
import type { Note } from '../../domain/types'

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

describe('hasWrittenNotes', () => {
  const n = (patch: Partial<Note>): Note => ({ ...newNoteDraft(1, DEFAULT_SETTINGS), ...patch })
  const notes = (...list: Note[]) => Object.fromEntries(list.map((x) => [x.id, x]))

  it('doesn’t count the welcome note, empty notes or the trash', () => {
    expect(
      hasWrittenNotes(
        notes(
          n({ content: WELCOME_CONTENT }),
          n({ content: '  \n' }),
          n({ content: 'binned', deletedAt: 5 }),
        ),
      ),
    ).toBe(false)
  })

  it('counts a note you wrote, and locked notes', () => {
    expect(hasWrittenNotes(notes(n({ content: WELCOME_CONTENT }), n({ content: 'mine' })))).toBe(
      true,
    )
    expect(
      hasWrittenNotes(
        notes(
          n({
            content: '',
            locked: { v: 1, salt: 's', iv: 'i', data: 'd', iterations: 1, origin: 'o' },
          }),
        ),
      ),
    ).toBe(true)
  })
})
