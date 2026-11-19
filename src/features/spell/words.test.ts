import { describe, expect, it } from 'vitest'
import { wordsToCheck } from './words'

const words = (text: string) => wordsToCheck(text, 0).map((w) => w.word)

describe('wordsToCheck', () => {
  it('finds words and where they are', () => {
    expect(wordsToCheck('Teh cat sat', 10)).toEqual([
      { word: 'Teh', from: 10, to: 13 },
      { word: 'cat', from: 14, to: 17 },
      { word: 'sat', from: 18, to: 21 },
    ])
  })

  it('keeps apostrophes inside words', () => {
    expect(words("don't it’s rock'n'roll")).toEqual(["don't", 'it’s', "rock'n'roll"])
  })

  it('handles accented letters', () => {
    expect(words('café naïve')).toEqual(['café', 'naïve'])
  })

  it('skips code, links, addresses and Markdown link targets', () => {
    const text = [
      'Use `npm instal` here.',
      '```js',
      'cnst x = 1',
      '```',
      'See https://exmaple.com/pathh and mail me@exmaple.com',
      'A [lnk text](https://exmaple.com) and [[Nte title]].',
    ].join('\n')
    expect(words(text)).toEqual(['Use', 'here', 'See', 'and', 'mail', 'lnk', 'text', 'and'])
  })

  it('skips words with digits, ALL-CAPS acronyms and camelCase names', () => {
    expect(words('v2 COVID HTML useState iPhone ok')).toEqual(['ok'])
  })

  it('skips one-letter words', () => {
    expect(words('a I x go')).toEqual(['go'])
  })
})
