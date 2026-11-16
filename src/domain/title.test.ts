import { displayTitle, TITLE_MAX } from './title'

describe('displayTitle', () => {
  it('uses the first non-empty line, trimmed', () => {
    expect(displayTitle({ title: null, content: '\n\n  hello world  \nmore' })).toBe('hello world')
  })

  it('cuts long first lines to 40 characters', () => {
    expect(TITLE_MAX).toBe(40)
    expect(displayTitle({ title: null, content: 'x'.repeat(60) })).toHaveLength(40)
  })

  it('falls back to Untitled for blank content', () => {
    expect(displayTitle({ title: null, content: '   \n ' })).toBe('Untitled')
    expect(displayTitle({ title: null, content: '' })).toBe('Untitled')
  })

  it('prefers an explicit title', () => {
    expect(displayTitle({ title: 'My note', content: 'abc' })).toBe('My note')
  })

  it('ignores a blank explicit title', () => {
    expect(displayTitle({ title: '  ', content: 'abc' })).toBe('abc')
  })
})
