import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { foldedRanges, foldState, forceParsing } from '@codemirror/language'
import { EditorSelection, EditorState } from '@codemirror/state'
import { EditorView, runScopeHandlers } from '@codemirror/view'
import { afterEach, describe, expect, it } from 'vitest'
import { markdownFold } from './markdownFold'

let view: EditorView | null = null
afterEach(() => {
  view?.destroy()
  view = null
})

const DOC = '# One\nintro\n## Two\nbody\n# Three\nend'

function editor(doc = DOC, cursor = 0) {
  view = new EditorView({
    state: EditorState.create({
      doc,
      selection: EditorSelection.cursor(cursor),
      extensions: [markdown({ base: markdownLanguage }), markdownFold],
    }),
    parent: document.body,
  })
  forceParsing(view, doc.length, 1000)
  return view
}

/** Press Ctrl+[ or Ctrl+] with Shift or Alt (jsdom is not a Mac). */
function press(v: EditorView, bracket: '[' | ']', mod: 'shift' | 'alt') {
  const keyCode = bracket === '[' ? 219 : 221
  const shifted = bracket === '[' ? '{' : '}'
  const e = new KeyboardEvent('keydown', {
    key: mod === 'shift' ? shifted : bracket,
    code: bracket === '[' ? 'BracketLeft' : 'BracketRight',
    ctrlKey: true,
    shiftKey: mod === 'shift',
    altKey: mod === 'alt',
  })
  Object.defineProperty(e, 'keyCode', { value: keyCode })
  return runScopeHandlers(v, e, 'editor')
}

const folds = (v: EditorView) => {
  const out: [number, number][] = []
  foldedRanges(v.state).between(0, v.state.doc.length, (from, to) => void out.push([from, to]))
  return out
}

describe('Markdown folding', () => {
  it('Ctrl+Shift+[ folds the heading section at the cursor, up to the next heading of its level', () => {
    const v = editor()
    expect(press(v, '[', 'shift')).toBe(true)
    // "# One" ends at 5; the section runs to the end of "body" (before "# Three").
    expect(folds(v)).toEqual([[5, DOC.indexOf('\n# Three')]])
  })

  it('Ctrl+Shift+] unfolds it again', () => {
    const v = editor()
    press(v, '[', 'shift')
    expect(press(v, ']', 'shift')).toBe(true)
    expect(folds(v)).toEqual([])
  })

  it('Ctrl+Alt+[ folds every section, Ctrl+Alt+] opens them all', () => {
    const v = editor()
    press(v, '[', 'alt')
    expect(folds(v).length).toBeGreaterThanOrEqual(2)
    press(v, ']', 'alt')
    expect(folds(v)).toEqual([])
  })

  it('moving the cursor into a folded section opens it', () => {
    const v = editor()
    press(v, '[', 'shift')
    v.dispatch({ selection: { anchor: DOC.indexOf('body') + 1 } })
    expect(folds(v)).toEqual([])
  })

  it('shows a fold arrow on each heading line, and none on plain text', () => {
    const v = editor()
    // The gutter keeps one hidden spacer marker to size itself; count the visible ones.
    const markers = [...v.dom.querySelectorAll<HTMLElement>('.cm-foldGutter .cm-md-fold')].filter(
      (m) => m.parentElement!.style.visibility !== 'hidden',
    )
    expect(markers.length).toBe(3)
  })

  it('a folded section shows a … chip that opens it when clicked', () => {
    const v = editor()
    press(v, '[', 'shift')
    const chip = v.dom.querySelector<HTMLElement>('.cm-foldPlaceholder')!
    expect(chip).not.toBeNull()
    expect(chip.getAttribute('aria-label')).toMatch(/show/i)
    chip.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(folds(v)).toEqual([])
  })

  it('folds survive turning the state into JSON and back (as when switching notes)', () => {
    const v = editor()
    press(v, '[', 'shift')
    const json = v.state.toJSON({ fold: foldState })
    const back = EditorState.fromJSON(json, { extensions: [markdownFold] }, { fold: foldState })
    expect(back.field(foldState).size).toBe(1)
  })
})
