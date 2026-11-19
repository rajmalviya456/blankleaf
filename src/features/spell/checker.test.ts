import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createChecker } from './checker'

const file = (name: string) => readFileSync(resolve('node_modules/dictionary-en', name), 'utf8')
const checker = createChecker(file('index.aff'), file('index.dic'), ['Blankleaf'])

describe('English spell checker', () => {
  it('knows common words, plurals, tenses and capitalised words', () => {
    for (const w of ['the', 'The', 'notes', 'walked', 'happily', "don't", 'don’t'])
      expect(checker.correct(w), w).toBe(true)
  })

  it('flags misspellings and suggests fixes', () => {
    expect(checker.correct('teh')).toBe(false)
    expect(checker.suggest('teh')).toContain('the')
    expect(checker.suggest('recieve')[0]).toBe('receive')
  })

  it('keeps suggestions short', () => {
    expect(checker.suggest('aple').length).toBeLessThanOrEqual(5)
  })

  it('knows words added to the personal dictionary', () => {
    expect(checker.correct('Blankleaf')).toBe(true)
    expect(checker.correct('Zorbex')).toBe(false)
    checker.add('Zorbex')
    expect(checker.correct('Zorbex')).toBe(true)
  })
})
