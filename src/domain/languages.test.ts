import { isLargeDoc, LANGUAGES, languageMeta, LARGE_DOC_CHARS } from './languages'

describe('LANGUAGES', () => {
  it('has unique ids and extensions for every selectable format', () => {
    const ids = LANGUAGES.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const l of LANGUAGES) expect(l.ext).toMatch(/^[a-z]+$/)
    expect(ids).toEqual(
      expect.arrayContaining([
        'plaintext',
        'markdown',
        'javascript',
        'typescript',
        'json',
        'python',
        'sql',
        'html',
        'css',
        'yaml',
        'shell',
        'log',
      ]),
    )
  })

  it('looks up metadata, falling back to plain text', () => {
    expect(languageMeta('python')).toMatchObject({ label: 'Python', ext: 'py', kind: 'code' })
    expect(languageMeta('auto').id).toBe('plaintext')
    expect(languageMeta('log').kind).toBe('log')
    expect(languageMeta('ruby')).toMatchObject({ label: 'Ruby', ext: 'rb', kind: 'code' })
  })
})

describe('isLargeDoc', () => {
  it('isLargeDoc threshold', () => {
    expect(LARGE_DOC_CHARS).toBe(2_000_000)
    expect(isLargeDoc(2_000_000)).toBe(false)
    expect(isLargeDoc(2_000_001)).toBe(true)
  })

  it('assigns every format to a picker group', () => {
    for (const l of LANGUAGES) expect(['text', 'data', 'code']).toContain(l.group)
  })
})
