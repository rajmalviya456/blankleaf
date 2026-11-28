import { CompletionContext, type Completion } from '@codemirror/autocomplete'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { forceParsing, syntaxTree } from '@codemirror/language'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { afterEach, describe, expect, it } from 'vitest'
import { SLASH_ITEMS, slashSource } from './slashMenu'

let view: EditorView | null = null
afterEach(() => {
  view?.destroy()
  view = null
})

function editor(doc: string, cursor = doc.length) {
  view = new EditorView({
    state: EditorState.create({
      doc,
      selection: { anchor: cursor },
      extensions: [markdown({ base: markdownLanguage })],
    }),
    parent: document.body,
  })
  forceParsing(view, doc.length, 1000)
  return view
}

const suggest = (v: EditorView) =>
  slashSource(new CompletionContext(v.state, v.state.selection.main.head, false))

/** Pick an item the way the menu does. */
function pick(v: EditorView, label: string) {
  const result = suggest(v)!
  const option = result.options.find((o) => o.label === label) as Completion
  const apply = option.apply as (v: EditorView, c: Completion, from: number, to: number) => void
  apply(v, option, result.from, v.state.selection.main.head)
}

describe('slash menu', () => {
  it('opens for / at the start of a line, and only there', () => {
    expect(suggest(editor('/'))?.options.length).toBe(SLASH_ITEMS.length)
    expect(suggest(editor('  /he'))).not.toBeNull()
    expect(suggest(editor('a/b'))).toBeNull()
    expect(suggest(editor('see 1/2'))).toBeNull()
    expect(suggest(editor('https://x/'))).toBeNull()
  })

  it('stays closed inside a code block', () => {
    expect(suggest(editor('```\n/'))).toBeNull()
  })

  it('a heading replaces the typed /…', () => {
    const v = editor('intro\n/hea')
    pick(v, 'Heading 2')
    expect(v.state.doc.toString()).toBe('intro\n## ')
    expect(v.state.selection.main.head).toBe(v.state.doc.length)
  })

  it('a checklist and a numbered list', () => {
    let v = editor('/')
    pick(v, 'Checklist')
    expect(v.state.doc.toString()).toBe('- [ ] ')
    v.destroy()
    v = editor('/')
    pick(v, 'Numbered list')
    expect(v.state.doc.toString()).toBe('1. ')
  })

  it('a code block puts the cursor inside it', () => {
    const v = editor('/')
    pick(v, 'Code block')
    expect(v.state.doc.toString()).toBe('```\n\n```')
    expect(v.state.selection.main.head).toBe(4)
  })

  it('a table puts the cursor in the first cell', () => {
    const v = editor('/')
    pick(v, 'Table')
    expect(v.state.doc.toString()).toBe(
      '| Column | Column |\n| ------ | ------ |\n|        |        |',
    )
    const head = v.state.selection.main.head
    const line = v.state.doc.lineAt(head)
    expect(line.number).toBe(3)
    expect(head - line.from).toBe(2)
  })

  it('a divider ends on a fresh line', () => {
    const v = editor('/')
    pick(v, 'Divider')
    expect(v.state.doc.toString()).toBe('---\n')
  })

  it('a divider right under text stays a divider, not that text’s heading underline', () => {
    const v = editor('Shopping\n/')
    pick(v, 'Divider')
    expect(v.state.doc.toString()).toBe('Shopping\n\n---\n')
    forceParsing(v, v.state.doc.length, 1000)
    const blocks: string[] = []
    for (let n = syntaxTree(v.state).topNode.firstChild; n; n = n.nextSibling) blocks.push(n.name)
    expect(blocks).toEqual(['Paragraph', 'HorizontalRule'])
    v.destroy()
    // Under a blank line it needs no other.
    pick(editor('Shopping\n\n/'), 'Divider')
    expect(view!.state.doc.toString()).toBe('Shopping\n\n---\n')
  })

  it('today’s date', () => {
    const v = editor('/')
    pick(v, 'Today’s date')
    expect(v.state.doc.toString()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('a quote', () => {
    const v = editor('/')
    pick(v, 'Quote')
    expect(v.state.doc.toString()).toBe('> ')
  })
})

it('lists items in menu order, not A–Z', () => {
  const v = editor('/')
  const opts = slashSource(new CompletionContext(v.state, 1, false))!.options
  const sorted = [...opts].sort((a, b) =>
    (a.sortText ?? a.label).localeCompare(b.sortText ?? b.label),
  )
  expect(sorted.map((o) => o.label).slice(0, 3)).toEqual(['Heading 1', 'Heading 2', 'Heading 3'])
  v.destroy()
  view = null
})
