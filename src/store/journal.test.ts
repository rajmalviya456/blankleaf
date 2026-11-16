import { DEFAULT_SETTINGS, emptySession, newNoteDraft } from '../domain/defaults'
import {
  clearJournal,
  journalKey,
  JOURNAL_PREFIX,
  readAllJournals,
  readJournal,
  writeJournal,
} from './journal'

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
    localStorage.setItem(journalKey(), '{nope')
    expect(readJournal()).toBeNull()
    localStorage.setItem(journalKey(), JSON.stringify({ foo: 1 }))
    expect(readJournal()).toBeNull()
  })

  it('returns false instead of throwing when storage is full', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    expect(writeJournal(data())).toBe(false)
    spy.mockRestore()
  })

  it('keeps one journal per window and lists them all, oldest first', () => {
    const other = `${JOURNAL_PREFIX}other-window`
    writeJournal({ ...data(), at: 9 })
    writeJournal({ ...data(), at: 3 }, other)
    const all = readAllJournals()
    expect(all.map((j) => j.journal.at)).toEqual([3, 9])
    expect(all.map((j) => j.key)).toEqual([other, journalKey()])
    clearJournal()
    expect(readAllJournals().map((j) => j.key)).toEqual([other])
  })
})
