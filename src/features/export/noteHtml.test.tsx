import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, newNoteDraft } from '../../domain/defaults'
import type { Note } from '../../domain/types'
import { noteToHtml } from './noteHtml'

const note = (patch: Partial<Note>): Note => ({
  ...newNoteDraft(1, DEFAULT_SETTINGS),
  title: 'Plan',
  ...patch,
})
const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html')

describe('export as a web page', () => {
  it('is a complete, self-contained page titled after the note', () => {
    const html = noteToHtml(note({ content: 'hello' }))
    expect(html).toMatch(/^<!doctype html>/i)
    const doc = parse(html)
    expect(doc.title).toBe('Plan')
    expect(doc.documentElement.lang).toBe('en')
    expect(doc.querySelector('meta[charset]')).not.toBeNull()
    expect(doc.querySelector('style')).not.toBeNull()
    expect(doc.querySelectorAll('script, link[rel="stylesheet"]')).toHaveLength(0)
  })

  it('formats Markdown', () => {
    const doc = parse(
      noteToHtml(
        note({
          mode: 'markdown',
          content:
            '# Big\n\n**bold**\n\n- [x] done\n\n| a |\n|---|\n| 1 |\n\n```js\nconst x = 1\n```',
        }),
      ),
    )
    expect(doc.querySelector('h1')?.textContent).toBe('Big')
    expect(doc.querySelector('strong')?.textContent).toBe('bold')
    expect(doc.querySelector('table')).not.toBeNull()
    expect(doc.querySelector<HTMLInputElement>('input[type=checkbox]')?.disabled).toBe(true)
    expect(doc.querySelector('.hljs-keyword')?.textContent).toBe('const')
  })

  it('keeps plain text exactly as written', () => {
    const doc = parse(noteToHtml(note({ content: 'a\n   b <c> & d' })))
    expect(doc.querySelector('h1')?.textContent).toBe('Plan')
    expect(doc.querySelector('pre')?.textContent).toBe('a\n   b <c> & d')
  })

  it('can’t be used to smuggle in scripts', () => {
    const doc = parse(
      noteToHtml(
        note({
          title: '</title><script>alert(1)</script>',
          mode: 'markdown',
          content:
            '<script>alert(2)</script>\n\n<img src=x onerror=alert(3)>\n\n[x](javascript:alert(4))',
        }),
      ),
    )
    expect(doc.querySelectorAll('script')).toHaveLength(0)
    expect(doc.documentElement.innerHTML).not.toMatch(/onerror|javascript:/i)
    expect(doc.title).toBe('</title><script>alert(1)</script>')
  })
})
