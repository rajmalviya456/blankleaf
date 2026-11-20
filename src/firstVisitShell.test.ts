import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { WELCOME_CONTENT } from './domain/defaults'
import { THEME_COLOR } from './lib/theme'

const html = readFileSync(resolve('index.html'), 'utf8')

describe('the instant first paint on a first visit', () => {
  it('shows the start of the real welcome note, word for word', () => {
    const m = /<pre class="np-shell-welcome"[^>]*>([\s\S]*?)<\/pre>/.exec(html)
    expect(m).not.toBeNull()
    // Browsers drop one line break right after <pre>, as the formatter knows.
    const shown = m![1]
      .replace(/^\n/, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
    expect(shown.length).toBeGreaterThan(150)
    expect(WELCOME_CONTENT.startsWith(shown)).toBe(true)
  })

  it('is only for browsers that haven’t opened Blankleaf before', () => {
    expect(html).toMatch(/localStorage\.getItem\('blankleaf:theme'\)/)
    expect(html).toMatch(/dataset\.firstVisit/)
  })
})

describe('the theme before any code loads', () => {
  it('runs the inline theme script, setting the page and the browser bar colour', () => {
    const script = /<script>\s*(\/\/ Set the theme[\s\S]*?)<\/script>/.exec(html)![1]
    const bar = document.createElement('meta')
    bar.name = 'theme-color'
    bar.content = '#111318'
    document.head.append(bar)
    localStorage.setItem('blankleaf:theme', 'light')
    new Function(script)()
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(bar.content).toBe('#ffffff')
    expect(THEME_COLOR.light).toBe('#ffffff')
    expect(THEME_COLOR.dark).toBe('#111318')
    bar.remove()
    localStorage.clear()
  })
})
