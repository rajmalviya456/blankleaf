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
/** A view on `doc` with these selection ranges (`[at]` alone is a cursor). */
function withRanges(doc: string, ...ranges: [number, number?][]): EditorView {
  const view = new EditorView({
    state: EditorState.create({
      doc,
      selection: EditorSelection.create(ranges.map(([a, b = a]) => EditorSelection.range(a, b))),
      extensions: [history(), EditorState.allowMultipleSelections.of(true)],
    }),
  })
  views.push(view)
  return view
}
const all = (doc: string) => withRanges(doc, [0, doc.length])
const selectAll = (v: EditorView) =>
  v.dispatch({ selection: EditorSelection.single(0, v.state.doc.length) })
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
  it('clears a checklist whether its boxes are ticked or not', () => {
    const v = all('- [x] shipped\n- [ ] todo')
    toggleLinePrefix(v, '- [ ] ')
    expect(text(v)).toBe('shipped\ntodo')
  })
  it('keeps a ticked box when it turns more lines into a checklist', () => {
    const v = all('- [x] shipped\nmilk')
    toggleLinePrefix(v, '- [ ] ')
    expect(text(v)).toBe('- [x] shipped\n- [ ] milk')
  })
  it('quotes list items around their markers, and unquotes only the quote', () => {
    const v = all('- [x] shipped\n- milk\n1. first')
    toggleLinePrefix(v, '> ')
    expect(text(v)).toBe('> - [x] shipped\n> - milk\n> 1. first')
    selectAll(v)
    toggleLinePrefix(v, '> ')
    expect(text(v)).toBe('- [x] shipped\n- milk\n1. first')
  })
  it('finds a nested item’s marker after its indent', () => {
    const v = all('- a\n  - b')
    toggleLinePrefix(v, '- ')
    expect(text(v)).toBe('a\n  b')
    selectAll(v)
    toggleLinePrefix(v, '- ')
    expect(text(v)).toBe('- a\n  - b')
    const w = all('1. a\n   1. b')
    toggleLinePrefix(w, '1. ')
    expect(text(w)).toBe('a\n   b')
  })
  it('leaves out the line a selection ends at the very start of', () => {
    const v = withRanges('Title\nNext line', [0, 6])
    setHeading(v, 2)
    expect(text(v)).toBe('## Title\nNext line')
  })
  it('acts on the lines of every selection range', () => {
    const v = withRanges('one\ntwo\nthree', [0], [8])
    setHeading(v, 2)
    expect(text(v)).toBe('## one\ntwo\n## three')
    const w = withRanges('one\ntwo\nthree', [0], [8])
    toggleLinePrefix(w, '> ')
    expect(text(w)).toBe('> one\ntwo\n> three')
    const x = withRanges('one\ntwo\nthree', [0], [8])
    toggleLinePrefix(x, '1. ')
    expect(text(x)).toBe('1. one\ntwo\n1. three')
  })
  it('numbers lines picked one per range in order, and changes a line once', () => {
    const v = withRanges('a\nb\nc', [0], [2], [4])
    toggleLinePrefix(v, '1. ')
    expect(text(v)).toBe('1. a\n2. b\n3. c')
    const w = withRanges('one\ntwo', [0], [2])
    toggleLinePrefix(w, '- ')
    expect(text(w)).toBe('- one\ntwo')
  })
  it('numbers a nested list level by level, nesting under each number', () => {
    const v = all('- a\n  - b\n  - c\n- d')
    toggleLinePrefix(v, '1. ')
    // Three spaces under "1. ": Markdown needs the number's width for the list to nest.
    expect(text(v)).toBe('1. a\n   1. b\n   2. c\n2. d')
  })

  it('switches a list from one kind to another', () => {
    const v = all('- a\n- b\n- c')
    toggleLinePrefix(v, '1. ')
    expect(text(v)).toBe('1. a\n2. b\n3. c')
    selectAll(v)
    toggleLinePrefix(v, '- [ ] ')
    expect(text(v)).toBe('- [ ] a\n- [ ] b\n- [ ] c')
    selectAll(v)
    toggleLinePrefix(v, '- ')
    expect(text(v)).toBe('- a\n- b\n- c')
  })
})

describe('blocks and inserts', () => {
  it('fences the selection as a code block on its own lines', () => {
    const v = make('x [let a = 1] y')
    insertCodeBlock(v)
    expect(text(v)).toBe('x \n```\nlet a = 1\n```\n y')
  })
  it('fences whole lines without a blank line before the closing fence', () => {
    const v = withRanges('one\ntwo\nthree', [0, 8])
    insertCodeBlock(v)
    expect(text(v)).toBe('```\none\ntwo\n```\nthree')
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
  it('does not sort in the line a selection ends at the start of', () => {
    const v = withRanges('c\nb\na\n0', [0, 6])
    sortLines(v)
    expect(text(v)).toBe('a\nb\nc\n0')
  })
  it('keeps the note’s final newline at the end when sorting it all', () => {
    const v = withRanges('b\na\n', [0])
    sortLines(v)
    expect(text(v)).toBe('a\nb\n')
  })
  it('sorts, dedupes and trims each selection range on its own', () => {
    const v = withRanges('b\na\nx\nd\nc', [0, 3], [6, 9])
    sortLines(v)
    expect(text(v)).toBe('a\nb\nx\nc\nd')
    expect(v.state.selection.ranges.map((r) => v.state.sliceDoc(r.from, r.to))).toEqual([
      'a\nb',
      'c\nd',
    ])
    const w = withRanges('a\na\nx\nb\nb', [0, 3], [6, 9])
    dedupeLines(w)
    expect(text(w)).toBe('a\nx\nb')
    const t = withRanges('a  \nx  \nb  ', [0, 1], [8, 9])
    trimLines(t)
    expect(text(t)).toBe('a\nx  \nb')
  })
  it('sorts naturally (item2 before item10)', () => {
    const v = make('item10\nitem2|')
    sortLines(v)
    expect(text(v)).toBe('item2\nitem10')
  })
})
