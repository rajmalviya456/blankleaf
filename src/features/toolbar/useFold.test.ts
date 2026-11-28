import { describe, expect, it } from 'vitest'
import { nextFold } from './useFold'

describe('nextFold', () => {
  it('folds one more group while the tools don’t fit', () => {
    expect(nextFold({ fold: 0, max: 3, natural: 1031, room: 984, freed: [] })).toBe(1)
    expect(nextFold({ fold: 1, max: 3, natural: 900, room: 760, freed: [] })).toBe(2)
  })

  it('stops at the last group', () => {
    expect(nextFold({ fold: 3, max: 3, natural: 900, room: 500, freed: [] })).toBe(3)
  })

  it('never folds where folding is off (the phone toolbar scrolls instead)', () => {
    expect(nextFold({ fold: 0, max: 0, natural: 900, room: 300, freed: [] })).toBe(0)
    expect(nextFold({ fold: 2, max: 0, natural: 900, room: 300, freed: [] })).toBe(0)
  })

  it('unfolds once the folded group would fit again, with a little to spare', () => {
    expect(nextFold({ fold: 1, max: 3, natural: 880, room: 1100, freed: [undefined, 150] })).toBe(0)
    // Exactly enough is not enough: the last few pixels would flip back and forth.
    expect(nextFold({ fold: 1, max: 3, natural: 880, room: 1030, freed: [undefined, 150] })).toBe(1)
  })

  it('stays put when it fits and the folded group’s width isn’t known yet', () => {
    expect(nextFold({ fold: 2, max: 3, natural: 700, room: 2000, freed: [] })).toBe(2)
  })

  it('stays put when it fits with nothing folded', () => {
    expect(nextFold({ fold: 0, max: 3, natural: 700, room: 2000, freed: [] })).toBe(0)
  })
})
