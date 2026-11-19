import { describe, expect, it } from 'vitest'
import { readability, syllables } from './readability'

describe('syllables', () => {
  it.each([
    ['cat', 1],
    ['table', 2],
    ['make', 1],
    ['beautiful', 3],
    ['readability', 5],
    ['the', 1],
  ])('%s has %i', (word, n) => {
    expect(syllables(word)).toBe(n)
  })
})

describe('readability', () => {
  it('rates short plain sentences as easy', () => {
    const r = readability('The cat sat on the mat. It was warm. We had tea.')
    expect(r.sentences).toBe(3)
    expect(r.words).toBe(12)
    expect(r.grade).toBeLessThan(3)
    expect(r.label).toBe('Easy')
  })

  it('rates long, many-syllable sentences as hard', () => {
    const r = readability(
      'Notwithstanding considerable organizational complexity, the administration consistently prioritized institutional accountability, comprehensive documentation and interdepartmental communication throughout the implementation.',
    )
    expect(r.grade).toBeGreaterThan(16)
    expect(r.label).toMatch(/hard/i)
  })

  it('finds sentences over 25 words, with their place in the note', () => {
    const long = Array.from({ length: 30 }, (_, i) => `word${'s'.repeat(i % 3)}`).join(' ') + '.'
    const text = `Short one. ${long} Another short one.`
    const r = readability(text)
    expect(r.longSentences).toHaveLength(1)
    const [s] = r.longSentences
    expect(text.slice(s.from, s.to)).toBe(long)
  })

  it('lists overused words, not common little words', () => {
    const r = readability(
      'Really this is really good. The plan is really simple. Really, the plan works. The plan is fine.',
    )
    expect(r.overused.map((o) => o.word)).toEqual(['really', 'plan'])
    expect(r.overused[0].count).toBe(4)
  })

  it('ignores code blocks, inline code and Markdown marks, and splits at headings and list items', () => {
    const r = readability(
      '# Title\n\n- first item\n- second item\n\n```js\nconst x = 1; const y = 2\n```\nUse `npm test` now.',
    )
    expect(r.sentences).toBe(4)
    expect(r.words).toBe(7)
  })

  it('handles empty text', () => {
    expect(readability('')).toMatchObject({ words: 0, sentences: 0, grade: 0, label: '' })
  })
})
