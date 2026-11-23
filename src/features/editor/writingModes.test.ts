import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { afterEach, describe, expect, it } from 'vitest'
import { focusMode, typewriter } from './writingModes'

let view: EditorView | null = null
afterEach(() => view?.destroy())

function make(doc: string, cursor: number, ext = focusMode) {
  view = new EditorView({
    state: EditorState.create({ doc, selection: { anchor: cursor }, extensions: [ext] }),
    parent: document.body,
  })
  return view
}

const dimmed = (v: EditorView) =>
  [...v.contentDOM.querySelectorAll('.cm-line')].map((l) => l.classList.contains('cm-dim'))

describe('focus mode', () => {
  it('dims every paragraph except the one with the cursor', () => {
    const v = make('one\ntwo\n\nthree\nfour\n\nfive', 'one\ntwo\n\nth'.length)
    expect(dimmed(v)).toEqual([true, true, true, false, false, true, true])
  })

  it('follows the cursor', () => {
    const v = make('a\n\nb', 0)
    expect(dimmed(v)).toEqual([false, true, true])
    v.dispatch({ selection: { anchor: 3 } })
    expect(dimmed(v)).toEqual([true, true, false])
  })

  it('on a blank line, dims everything else', () => {
    const v = make('a\n\nb', 2)
    expect(dimmed(v)).toEqual([true, false, true])
  })
})

describe('typewriter mode', () => {
  it('asks the editor to keep the cursor line in the middle as you type', () => {
    const v = make('a\nb\nc', 0, typewriter)
    const tr = v.state.update({ changes: { from: 0, insert: 'x' }, userEvent: 'input.type' })
    expect(tr.effects.length).toBeGreaterThan(0)
  })

  it('leaves mouse selections alone, so dragging doesn’t jump the page', () => {
    const v = make('a\nb\nc', 0, typewriter)
    const tr = v.state.update({ selection: { anchor: 2 }, userEvent: 'select.pointer' })
    expect(tr.effects).toHaveLength(0)
  })

  it('leaves room below the last line so it can sit in the middle too', () => {
    const v = make('a', 0, typewriter)
    expect(v.dom.classList.contains('cm-typewriter')).toBe(true)
  })
})
