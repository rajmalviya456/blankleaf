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

  it('drops a Markdown heading’s # marks from the first line', () => {
    expect(displayTitle({ title: null, content: '# Trip to Lisbon\nmore' })).toBe('Trip to Lisbon')
    expect(displayTitle({ title: null, content: '  ### Notes  ' })).toBe('Notes')
    // Not a heading: no space after #, or nothing after the marks.
    expect(displayTitle({ title: null, content: '#todo' })).toBe('#todo')
    expect(displayTitle({ title: null, content: '##' })).toBe('##')
    // An explicit title is shown exactly as typed.
    expect(displayTitle({ title: '# Kept', content: 'abc' })).toBe('# Kept')
  })

  it('ignores a blank explicit title', () => {
    expect(displayTitle({ title: '  ', content: 'abc' })).toBe('abc')
  })
})

describe('displayTitle skips marker-only lines', () => {
  it('skips a code fence or front-matter line and uses the text after it', () => {
    expect(displayTitle({ title: '', content: '```js\nconst a = 1\n```' })).toBe('const a = 1')
    expect(displayTitle({ title: '', content: '---\ntitle: x\n---\nBody' })).toBe('title: x')
    expect(displayTitle({ title: '', content: '~~~\nhi' })).toBe('hi')
  })

  it('still names a note that holds only markers', () => {
    expect(displayTitle({ title: '', content: '```' })).toBe('```')
  })
})

describe('displayTitle cut', () => {
  it('never cuts an emoji in half', () => {
    const t = displayTitle({ title: null, content: 'a'.repeat(TITLE_MAX - 1) + '😀 more' })
    expect(t).toBe('a'.repeat(TITLE_MAX - 1))
    expect(t.isWellFormed()).toBe(true)
  })
})
