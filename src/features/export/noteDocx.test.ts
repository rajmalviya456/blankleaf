import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, newNoteDraft } from '../../domain/defaults'
import type { Note } from '../../domain/types'
import { noteToDocx } from './noteDocx'

const note = (patch: Partial<Note>): Note => ({
  ...newNoteDraft(1, DEFAULT_SETTINGS),
  title: 'Plan',
  ...patch,
})

async function open(n: Note) {
  const blob = await noteToDocx(n)
  const zip = await JSZip.loadAsync(await blob.arrayBuffer())
  const xml = await zip.file('word/document.xml')!.async('string')
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const text = (el: Element) =>
    [...el.getElementsByTagName('w:t')].map((t) => t.textContent).join('')
  const paragraphs = [...doc.getElementsByTagName('w:p')]
  const para = (s: string) => paragraphs.find((p) => text(p).includes(s))!
  const style = (p: Element) => p.getElementsByTagName('w:pStyle')[0]?.getAttribute('w:val')
  const has = (p: Element, tag: string) => p.getElementsByTagName(tag).length > 0
  return { zip, xml, doc, text, paragraphs, para, style, has, blob }
}

describe('export as a Word document', () => {
  it('makes a real .docx', async () => {
    const { blob, zip } = await open(note({ content: 'hi' }))
    expect(blob.type).toContain('wordprocessingml')
    expect(zip.file('[Content_Types].xml')).not.toBeNull()
    const core = await zip.file('docProps/core.xml')!.async('string')
    expect(core).toContain('Plan')
  })

  it('turns Markdown into Word formatting', async () => {
    const d = await open(
      note({
        mode: 'markdown',
        content: [
          '# Big',
          '## Small',
          'Some **bold**, _soft_, ~~gone~~ and `code`.',
          '- apple\n  - nested',
          '1. first\n2. second',
          '- [x] done\n- [ ] open',
          '> wise words',
          '[site](https://example.com)',
          '| Name | Age |\n|---|---|\n| Ann | 30 |',
          '```js\nconst x = 1\n  indented()\n```',
        ].join('\n\n'),
      }),
    )
    expect(d.style(d.para('Big'))).toBe('Heading1')
    expect(d.style(d.para('Small'))).toBe('Heading2')
    const runs = [...d.para('Some').getElementsByTagName('w:r')]
    const run = (s: string) => runs.find((r) => d.text(r) === s)!
    expect(d.has(run('bold'), 'w:b')).toBe(true)
    expect(d.has(run('soft'), 'w:i')).toBe(true)
    expect(d.has(run('gone'), 'w:strike')).toBe(true)
    expect(run('code').getElementsByTagName('w:rFonts')[0].getAttribute('w:ascii')).toBe('Consolas')
    const level = (s: string) => d.para(s).getElementsByTagName('w:ilvl')[0]?.getAttribute('w:val')
    expect(level('apple')).toBe('0')
    expect(level('nested')).toBe('1')
    expect(d.has(d.para('first'), 'w:numPr')).toBe(true)
    expect(d.text(d.para('done'))).toBe('☑ done')
    expect(d.text(d.para('open'))).toBe('☐ open')
    expect(d.has(d.para('wise words'), 'w:ind')).toBe(true)
    expect(d.doc.getElementsByTagName('w:hyperlink')).toHaveLength(1)
    const rels = await d.zip.file('word/_rels/document.xml.rels')!.async('string')
    expect(rels).toContain('https://example.com')
    expect(d.doc.getElementsByTagName('w:tbl')).toHaveLength(1)
    expect(d.doc.getElementsByTagName('w:tc')).toHaveLength(4)
    expect(d.text(d.para('indented'))).toBe('  indented()')
  })

  it('numbers each ordered list from 1', async () => {
    const d = await open(note({ mode: 'markdown', content: '1. a\n\ntext\n\n1. b' }))
    const id = (s: string) => d.para(s).getElementsByTagName('w:numId')[0].getAttribute('w:val')
    expect(id('a')).not.toBe(id('b'))
  })

  it('keeps plain text line by line, with spacing', async () => {
    const d = await open(note({ content: 'first\n\n   third <&>' }))
    expect(d.style(d.para('Plan'))).toBe('Title')
    expect(d.text(d.para('third'))).toBe('   third <&>')
    expect(d.paragraphs).toHaveLength(4)
  })

  it('only links to safe addresses, and never fetches images', async () => {
    const d = await open(
      note({
        mode: 'markdown',
        content: '[bad](javascript:alert(1)) ![a cat](https://example.com/cat.png)',
      }),
    )
    expect(d.doc.getElementsByTagName('w:hyperlink')).toHaveLength(0)
    expect(d.xml).not.toContain('javascript:')
    expect(d.doc.getElementsByTagName('w:drawing')).toHaveLength(0)
    expect(d.text(d.paragraphs[0])).toContain('bad')
    expect(d.text(d.paragraphs[0])).toContain('a cat')
  })
})
