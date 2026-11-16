import { EditorSelection, EditorState } from '@codemirror/state'
import { history, undo } from '@codemirror/commands'
import { EditorView } from '@codemirror/view'
import { afterEach, describe, expect, it } from 'vitest'
import {
  changeCase,
  dedupeLines,
  insertCodeBlock,
  insertLink,
  insertText,
  setHeading,
  sortLines,
  toggleInline,
  toggleLinePrefix,
  trimLines,
} from './editCommands'

const views: EditorView[] = []
afterEach(() => views.splice(0).forEach((v) => v.destroy()))

/** `[` and `]` mark the selection; a lone `|` marks the cursor. */
function make(src: string): EditorView {
  let doc = src
  let sel: EditorSelection
  const a = doc.indexOf('[')
  if (a >= 0) {
    doc = doc.replace('[', '')
    const b = doc.indexOf(']')
    doc = doc.replace(']', '')
    sel = EditorSelection.single(a, b)
  } else {
    const c = Math.max(0, doc.indexOf('|'))
    doc = doc.replace('|', '')
    sel = EditorSelection.single(c)
  }
  const view = new EditorView({
    state: EditorState.create({ doc, selection: sel, extensions: [history()] }),
  })
  views.push(view)
  return view
}
const text = (v: EditorView) => v.state.doc.toString()
const selected = (v: EditorView) => {
  const r = v.state.selection.main
  return v.state.sliceDoc(r.from, r.to)
}

describe('toggleInline', () => {
  it('wraps the selection and keeps it selected', () => {
    const v = make('ship [tabs] now')
    toggleInline(v, '**')
    expect(text(v)).toBe('ship **tabs** now')
    expect(selected(v)).toBe('tabs')
  })
  it('unwraps when already wrapped', () => {
    const v = make('ship **[tabs]** now')
    toggleInline(v, '**')
    expect(text(v)).toBe('ship tabs now')
    expect(selected(v)).toBe('tabs')
  })
  it('inserts empty markers at the cursor and puts the cursor between them', () => {
    const v = make('a |b')
    toggleInline(v, '`')
    expect(text(v)).toBe('a ``b')
    expect(v.state.selection.main.head).toBe(3)
  })
  it('is one undo step', () => {
    const v = make('[x]')
    toggleInline(v, '~~')
    undo(v)
    expect(text(v)).toBe('x')
  })
})

describe('line prefixes', () => {
  it('sets, changes and clears a heading', () => {
    const v = make('Ti|tle')
    setHeading(v, 2)
    expect(text(v)).toBe('## Title')
    setHeading(v, 1)
    expect(text(v)).toBe('# Title')
    setHeading(v, 0)
    expect(text(v)).toBe('Title')
  })
  it('toggles a bullet on every selected line', () => {
    const v = make('[a\nb]')
    toggleLinePrefix(v, '- ')
    expect(text(v)).toBe('- a\n- b')
    toggleLinePrefix(v, '- ')
    expect(text(v)).toBe('a\nb')
  })
  it('numbers lines in order', () => {
    const v = make('[a\nb\nc]')
    toggleLinePrefix(v, '1. ')
    expect(text(v)).toBe('1. a\n2. b\n3. c')
  })
  it('quotes a line', () => {
    const v = make('hi|')
    toggleLinePrefix(v, '> ')
    expect(text(v)).toBe('> hi')
  })
})

describe('blocks and inserts', () => {
  it('fences the selection as a code block on its own lines', () => {
    const v = make('x [let a = 1] y')
    insertCodeBlock(v)
    expect(text(v)).toBe('x \n```\nlet a = 1\n```\n y')
  })
  it('makes a link from the selection and selects the url', () => {
    const v = make('see [docs]')
    insertLink(v)
    expect(text(v)).toBe('see [docs](https://)')
    expect(selected(v)).toBe('https://')
  })
  it('inserts text over the selection', () => {
    const v = make('a [b] c')
    insertText(v, 'Z')
    expect(text(v)).toBe('a Z c')
  })
})

describe('text tools', () => {
  it('changes case of the selection', () => {
    const v = make('[hello wORLD]')
    changeCase(v, 'upper')
    expect(text(v)).toBe('HELLO WORLD')
    changeCase(v, 'title')
    expect(text(v)).toBe('Hello World')
    changeCase(v, 'lower')
    expect(text(v)).toBe('hello world')
  })
  it('changes case of the word at the cursor when nothing is selected', () => {
    const v = make('one tw|o three')
    changeCase(v, 'upper')
    expect(text(v)).toBe('one TWO three')
  })
  it('sorts, dedupes and trims the whole note when nothing is selected', () => {
    const v = make('b\na\n|c\na')
    sortLines(v)
    expect(text(v)).toBe('a\na\nb\nc')
    dedupeLines(v)
    expect(text(v)).toBe('a\nb\nc')
    const w = make('  x  \n\ty\t|')
    trimLines(w)
    expect(text(w)).toBe('  x\n\ty')
  })
  it('sorts only the selected lines', () => {
    const v = make('z\n[b\na]\ny')
    sortLines(v)
    expect(text(v)).toBe('z\na\nb\ny')
  })
  it('sorts naturally (item2 before item10)', () => {
    const v = make('item10\nitem2|')
    sortLines(v)
    expect(text(v)).toBe('item2\nitem10')
  })
})
