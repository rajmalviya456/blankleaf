import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ACCENTS } from '../domain/accents'
import { accentShade, contrast, SURFACE_EDGES } from './color'

describe('contrast', () => {
  it('matches the WCAG formula', () => {
    expect(contrast('#ffffff', '#000000')).toBeCloseTo(21, 5)
    expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 2)
    expect(contrast('#ffffff', '#777777')).toBe(contrast('#777777', '#ffffff'))
  })
})

describe('accentShade', () => {
  // Every accent Settings offers, plus a few awkward ones a backup file could carry.
  const picks = [...ACCENTS.map((a) => a.value).filter(Boolean), '#ffff00', '#000000', '#7fffd4']

  it.each(picks)('%s stays readable on light surfaces, with white text on it', (hex) => {
    const c = accentShade(hex, 'light')
    expect(contrast(c, SURFACE_EDGES.light.surface)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(c, SURFACE_EDGES.light.onAccent)).toBeGreaterThanOrEqual(4.5)
  })

  it.each(picks)('%s stays readable on dark surfaces, with dark text on it', (hex) => {
    const c = accentShade(hex, 'dark')
    expect(contrast(c, SURFACE_EDGES.dark.surface)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(c, SURFACE_EDGES.dark.onAccent)).toBeGreaterThanOrEqual(4.5)
  })

  it('leaves a colour alone when it already reads well', () => {
    expect(accentShade('#3d5ce6', 'light')).toBe('#3d5ce6')
    expect(accentShade('#7c9cff', 'dark')).toBe('#7c9cff')
  })

  it('keeps the colour’s hue: teal stays teal', () => {
    const c = accentShade('#14b8a6', 'light')
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
    expect(g).toBeGreaterThan(r)
    expect(b).toBeGreaterThan(r)
  })
})

it('measures against the theme’s own colours', () => {
  const css = readFileSync(join(process.cwd(), 'src/styles/index.css'), 'utf8')
  const token = (block: string, name: string) => {
    const start = css.indexOf(`${block} {`)
    return new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(css.slice(start))?.[1]
  }
  expect(token(':root', 'bg-hover')).toBe(SURFACE_EDGES.light.surface)
  expect(token(':root', 'accent-fg')).toBe(SURFACE_EDGES.light.onAccent)
  expect(token(":root[data-theme='dark']", 'bg-hover')).toBe(SURFACE_EDGES.dark.surface)
  expect(token(":root[data-theme='dark']", 'accent-fg')).toBe(SURFACE_EDGES.dark.onAccent)
})
