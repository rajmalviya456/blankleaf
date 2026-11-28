/**
 * WCAG 2.1 AA contrast for the colour tokens, in both themes: text colours need 4.5:1 and the
 * field outline 3:1 on every surface they're drawn on. A token change that breaks this fails
 * here, before anyone has to spot it in a screenshot.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { contrast } from '../lib/color'

// The test setup leaves CSS out of imports, so read the file itself (tests run from the root).
const css = readFileSync(join(process.cwd(), 'src/styles/index.css'), 'utf8')

/** The `--name: #hex` tokens in the first block opened by `selector`. */
function tokens(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`)
  const body = css.slice(start, css.indexOf('\n}', start))
  return Object.fromEntries(
    [...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((m) => [m[1], m[2]]),
  )
}

const SURFACES = ['bg', 'bg-elev', 'bg-sunken', 'bg-hover']
const TEXT = ['fg', 'fg-muted', 'fg-faint', 'accent', 'danger', 'warn', 'ok']

describe.each([
  ['light', ':root'],
  ['dark', ":root[data-theme='dark']"],
])('%s theme', (_, selector) => {
  const t = tokens(selector)

  it.each(TEXT)('--%s text is readable (4.5:1) on every surface', (name) => {
    const low = SURFACES.map((s) => ({ s, ratio: contrast(t[name], t[s]) })).filter(
      (r) => r.ratio < 4.5,
    )
    expect(low, `--${name} ${t[name]}`).toEqual([])
  })

  it('text field outlines stand out (3:1) on every surface', () => {
    for (const s of SURFACES) expect(contrast(t['border-field'], t[s])).toBeGreaterThanOrEqual(3)
  })
})

it('prints with the light colours, whatever the theme', () => {
  const light = tokens(':root')
  const print = tokens("  :root[data-theme='dark']")
  for (const name of [...SURFACES, ...TEXT]) expect(print[name], name).toBe(light[name])
})
