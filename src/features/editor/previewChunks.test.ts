import { describe, expect, it } from 'vitest'
import { canChunk, previewChunks } from './previewChunks'

describe('previewChunks', () => {
  it('splits at blank lines into chunks of about the target size, covering all the text', () => {
    const text = Array.from({ length: 50 }, (_, i) => `Paragraph ${i} ${'word '.repeat(40)}`).join(
      '\n\n',
    )
    const chunks = previewChunks(text, 1000)
    expect(chunks.length).toBeGreaterThan(5)
    for (const c of chunks) expect(text.slice(c.offset, c.offset + c.text.length)).toBe(c.text)
    expect(chunks.map((c) => c.text).join('')).toBe(text)
  })

  it('never splits inside a code block', () => {
    const code = '```js\n' + 'line\n\n'.repeat(400) + '```'
    const text = `Intro\n\n${code}\n\nOutro`
    const chunks = previewChunks(text, 200)
    expect(chunks.some((c) => c.text.includes(code))).toBe(true)
  })

  it('keeps a whole note as one chunk when it is small', () => {
    expect(previewChunks('# Hi\n\ntext', 1000)).toEqual([{ text: '# Hi\n\ntext', offset: 0 }])
  })

  it('isn’t used when parts of the note refer to each other', () => {
    expect(canChunk('See note[^1].\n\n[^1]: the note')).toBe(false)
    expect(canChunk('A [link][ref].\n\n[ref]: https://x.test')).toBe(false)
    expect(canChunk('Plain [link](https://x.test) and text.')).toBe(true)
  })
})
