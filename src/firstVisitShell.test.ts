import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { WELCOME_CONTENT } from './domain/defaults'

const html = readFileSync(resolve('index.html'), 'utf8')

describe('the instant first paint on a first visit', () => {
  it('shows the start of the real welcome note, word for word', () => {
    const m = /<pre class="np-shell-welcome"[^>]*>([\s\S]*?)<\/pre>/.exec(html)
    expect(m).not.toBeNull()
    const shown = m![1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    expect(shown.length).toBeGreaterThan(150)
    expect(WELCOME_CONTENT.startsWith(shown)).toBe(true)
  })

  it('is only for browsers that haven’t opened Blankleaf before', () => {
    expect(html).toMatch(/localStorage\.getItem\('blankleaf:theme'\)/)
    expect(html).toMatch(/dataset\.firstVisit/)
  })
})
