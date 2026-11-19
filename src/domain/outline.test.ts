import { describe, expect, it } from 'vitest'
import { outline } from './outline'

describe('outline', () => {
  it('lists headings with their level and where they start', () => {
    const text = '# Title\n\nintro\n\n## Part one\ntext\n### Detail ##\n## Part two'
    expect(outline(text)).toEqual([
      { level: 1, text: 'Title', from: 0 },
      { level: 2, text: 'Part one', from: text.indexOf('## Part one') },
      { level: 3, text: 'Detail', from: text.indexOf('### Detail') },
      { level: 2, text: 'Part two', from: text.indexOf('## Part two') },
    ])
  })

  it('skips # lines inside code blocks', () => {
    const text = '# Real\n```sh\n# a comment\n```\n~~~\n# also code\n~~~\n## After'
    expect(outline(text).map((h) => h.text)).toEqual(['Real', 'After'])
  })

  it('ignores hashtags and #s without a space', () => {
    expect(outline('#tag\n#hashtag text\n####### seven\n  # indented')).toEqual([
      { level: 1, text: 'indented', from: '#tag\n#hashtag text\n####### seven\n'.length },
    ])
  })

  it('drops inline Markdown from heading text', () => {
    expect(outline('## **Bold** and `code` and [link](https://x)')[0].text).toBe(
      'Bold and code and link',
    )
  })

  it('returns nothing for text without headings', () => {
    expect(outline('just text')).toEqual([])
  })
})
