import { lineColAt, textStats } from './textStats'

describe('textStats', () => {
  it('counts nothing in empty text', () => {
    expect(textStats('')).toEqual({ words: 0, chars: 0 })
  })

  it('counts words across spaces and newlines', () => {
    expect(textStats('hello  world\nfoo')).toEqual({ words: 3, chars: 16 })
    expect(textStats('  \n\t ')).toEqual({ words: 0, chars: 5 })
  })
})

describe('lineColAt', () => {
  it('returns 1-based line and column for an offset', () => {
    expect(lineColAt('', 0)).toEqual({ line: 1, col: 1 })
    expect(lineColAt('ab\ncd', 0)).toEqual({ line: 1, col: 1 })
    expect(lineColAt('ab\ncd', 2)).toEqual({ line: 1, col: 3 })
    expect(lineColAt('ab\ncd', 3)).toEqual({ line: 2, col: 1 })
    expect(lineColAt('ab\ncd', 5)).toEqual({ line: 2, col: 3 })
  })

  it('clamps offsets beyond the text', () => {
    expect(lineColAt('ab', 99)).toEqual({ line: 1, col: 3 })
  })
})
