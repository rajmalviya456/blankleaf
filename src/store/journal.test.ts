import { DEFAULT_SETTINGS, emptySession, newNoteDraft } from '../domain/defaults'
import { clearJournal, JOURNAL_KEY, readJournal, writeJournal } from './journal'

beforeEach(() => localStorage.clear())

const data = () => ({
  at: 5,
  notes: [{ ...newNoteDraft(1, DEFAULT_SETTINGS), content: 'unsaved' }],
  session: emptySession(),
  settings: DEFAULT_SETTINGS,
})

describe('journal', () => {
  it('round-trips through localStorage', () => {
    const d = data()
    expect(writeJournal(d)).toBe(true)
    expect(readJournal()).toEqual(d)
    clearJournal()
    expect(readJournal()).toBeNull()
  })

  it('ignores corrupt or foreign data', () => {
    localStorage.setItem(JOURNAL_KEY, '{nope')
    expect(readJournal()).toBeNull()
    localStorage.setItem(JOURNAL_KEY, JSON.stringify({ foo: 1 }))
    expect(readJournal()).toBeNull()
  })

  it('returns false instead of throwing when storage is full', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    expect(writeJournal(data())).toBe(false)
    spy.mockRestore()
  })
})
