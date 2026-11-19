import { describe, expect, it } from 'vitest'
import { paletteScore } from './paletteScore'

const rank = (search: string, items: [string, string[]?][]) =>
  items
    .map(([value, keywords]) => ({ value, score: paletteScore(value, search, keywords) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.value)

describe('palette ranking', () => {
  it('puts a word match ahead of letters scattered through a title', () => {
    expect(
      rank('spell', [
        ['New from template: Checklist template.checklist'],
        ['Toggle spell check view.spellcheck', ['spelling', 'typos']],
      ])[0],
    ).toBe('Toggle spell check view.spellcheck')
  })

  it('ranks the start of a title, then a word start, then anywhere', () => {
    expect(
      rank('zen', [['Citizen notes x'], ['Toggle zen mode view.zen'], ['Zen tips x']]),
    ).toEqual(['Zen tips x', 'Toggle zen mode view.zen', 'Citizen notes x'])
  })

  it('matches keywords, below title matches', () => {
    expect(
      rank('dictation', [
        ['Voice typing voice.toggle', ['dictate', 'dictation']],
        ['Dictation notes x'],
      ]),
    ).toEqual(['Dictation notes x', 'Voice typing voice.toggle'])
  })

  it('matches several words in any order', () => {
    expect(
      paletteScore('Download all notes as files (.zip) data.zip', 'zip notes'),
    ).toBeGreaterThan(0.5)
  })

  it('still finds loose matches, last', () => {
    const loose = paletteScore('Toggle spell check view.spellcheck', 'tgsc')
    expect(loose).toBeGreaterThan(0)
    expect(loose).toBeLessThan(0.4)
  })

  it('shows everything for an empty search', () => {
    expect(paletteScore('Anything', '  ')).toBe(1)
  })
})
