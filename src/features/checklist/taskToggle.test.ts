import { describe, expect, it } from 'vitest'
import { toggleTaskAt } from './taskToggle'

describe('toggleTaskAt', () => {
  it('ticks and unticks the box on the item that starts at the offset', () => {
    const src = 'Plan\n\n- [ ] milk\n- [x] eggs\n'
    const milk = src.indexOf('- [ ] milk')
    expect(toggleTaskAt(src, milk)).toBe('Plan\n\n- [x] milk\n- [x] eggs\n')
    const eggs = src.indexOf('- [x] eggs')
    expect(toggleTaskAt(src, eggs)).toBe('Plan\n\n- [ ] milk\n- [ ] eggs\n')
  })

  it('handles numbered, nested and capital-X items', () => {
    expect(toggleTaskAt('1. [X] done', 0)).toBe('1. [ ] done')
    const nested = '- a\n  - [ ] b'
    expect(toggleTaskAt(nested, nested.indexOf('- [ ] b'))).toBe('- a\n  - [x] b')
    expect(toggleTaskAt('* [ ] star', 0)).toBe('* [x] star')
  })

  it('leaves the text alone when there is no box there', () => {
    expect(toggleTaskAt('- plain item', 0)).toBe('- plain item')
  })
})
