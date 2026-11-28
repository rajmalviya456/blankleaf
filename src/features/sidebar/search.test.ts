import { DEFAULT_SETTINGS, newNoteDraft } from '../../domain/defaults'
import type { Note } from '../../domain/types'
import { searchNotes } from './search'

let n = 0
const note = (content: string, patch: Partial<Note> = {}): Note => ({
  ...newNoteDraft(1000 + n++, DEFAULT_SETTINGS),
  content,
  ...patch,
})

describe('searchNotes', () => {
  it('points at the match even when lowercasing changes a letter’s length', () => {
    // "İ" lowercases to two code units, which used to shift every offset after it.
    const [hit] = searchNotes([note('İİİ hello')], 'hello')
    expect(hit.firstMatch).toBe(4)
    expect(hit.snippet.slice(...hit.matchRanges[0])).toBe('hello')
  })

  it('searchNotes empty query returns []', () => {
    expect(searchNotes([note('abc')], '   ')).toEqual([])
  })

  it('title match ranks above content match', () => {
    const inBody = note('meeting notes\nabout the budget')
    const inTitle = note('stuff', { title: 'Budget plan' })
    const res = searchNotes([inBody, inTitle], 'budget')
    expect(res.map((r) => r.id)).toEqual([inTitle.id, inBody.id])
  })

  it('snippet contains the match and range points at it', () => {
    const long = 'x '.repeat(200) + 'the Needle is here ' + 'y '.repeat(200)
    const [r] = searchNotes([note(long)], 'needle')
    expect(r.snippet.length).toBeLessThanOrEqual(130)
    const [from, to] = r.matchRanges[0]
    expect(r.snippet.slice(from, to).toLowerCase()).toBe('needle')
    expect(r.firstMatch).toBe(long.toLowerCase().indexOf('needle'))
  })

  it('is case-insensitive and counts matches', () => {
    const [r] = searchNotes([note('Foo foo FOO')], 'foo')
    expect(r.count).toBe(3)
  })

  it('excludes trashed notes', () => {
    expect(searchNotes([note('hello', { deletedAt: 5 })], 'hello')).toEqual([])
  })

  it('1000 notes × 5KB searches in under 100ms', () => {
    const notes = Array.from({ length: 1000 }, (_, i) => note('lorem ipsum '.repeat(420) + i))
    const t = performance.now()
    searchNotes(notes, 'needle')
    expect(performance.now() - t).toBeLessThan(100)
  })
})
