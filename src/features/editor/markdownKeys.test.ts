import { markdown } from '@codemirror/lang-markdown'
import { EditorSelection, EditorState } from '@codemirror/state'
import { EditorView, runScopeHandlers } from '@codemirror/view'
import { afterEach, describe, expect, it } from 'vitest'
import { MARKDOWN_SHORTCUTS, markdownKeys } from './markdownKeys'

let view: EditorView | null = null
afterEach(() => view?.destroy())

function editor(doc: string, from: number, to = from) {
  view = new EditorView({
    state: EditorState.create({
      doc,
      selection: EditorSelection.range(from, to),
      extensions: [markdown(), markdownKeys],
    }),
    parent: document.body,
  })
  return view
}

/** Press Mod+key (jsdom is not a Mac, so Mod is Ctrl). */
function press(v: EditorView, key: string, mods: { shift?: boolean; alt?: boolean } = {}) {
  const code = /^\d$/.test(key) ? `Digit${key}` : `Key${key.toUpperCase()}`
  const keyCode = /^\d$/.test(key) ? 48 + Number(key) : key.toUpperCase().charCodeAt(0)
  const e = new KeyboardEvent('keydown', {
    key,
    code,
    keyCode,
    ctrlKey: true,
    shiftKey: !!mods.shift,
    altKey: !!mods.alt,
  } as KeyboardEventInit)
  // jsdom has no keyCode in the init dictionary.
  Object.defineProperty(e, 'keyCode', { value: keyCode })
  return runScopeHandlers(v, e, 'editor')
}

describe('Markdown shortcuts', () => {
  it('Mod-B bolds the selection, and again takes it off', () => {
    const v = editor('say hello now', 4, 9)
    const mod = MARKDOWN_SHORTCUTS.find((s) => s.label === 'Bold')!.key
    expect(mod).toBe('Mod-b')
    expect(runKey(v, mod)).toBe(true)
    expect(v.state.doc.toString()).toBe('say **hello** now')
    runKey(v, mod)
    expect(v.state.doc.toString()).toBe('say hello now')
  })

  it('italic, strikethrough, code and link', () => {
    const v = editor('x', 0, 1)
    runKey(v, 'Mod-i')
    expect(v.state.doc.toString()).toBe('_x_')
    v.dispatch({ changes: { from: 0, to: 3, insert: 'x' }, selection: { anchor: 0, head: 1 } })
    runKey(v, 'Mod-Shift-x')
    expect(v.state.doc.toString()).toBe('~~x~~')
    v.dispatch({ changes: { from: 0, to: 5, insert: 'x' }, selection: { anchor: 0, head: 1 } })
    runKey(v, 'Mod-e')
    expect(v.state.doc.toString()).toBe('`x`')
    v.dispatch({ changes: { from: 0, to: 3, insert: 'x' }, selection: { anchor: 0, head: 1 } })
    runKey(v, 'Mod-Shift-k')
    expect(v.state.doc.toString()).toBe('[x](https://)')
  })

  it('headings and lists act on the cursor line', () => {
    const v = editor('Title\nitem', 2)
    runKey(v, 'Mod-Alt-2')
    expect(v.state.doc.line(1).text).toBe('## Title')
    runKey(v, 'Mod-Alt-0')
    expect(v.state.doc.line(1).text).toBe('Title')
    v.dispatch({ selection: { anchor: v.state.doc.length } })
    runKey(v, 'Mod-Shift-9')
    expect(v.state.doc.line(2).text).toBe('- [ ] item')
    runKey(v, 'Mod-Shift-8')
    expect(v.state.doc.line(2).text).toBe('- item')
    runKey(v, 'Mod-Shift-7')
    expect(v.state.doc.line(2).text).toBe('1. item')
  })

  it('a real Ctrl/⌘+B key press reaches the binding', () => {
    const v = editor('hi', 0, 2)
    expect(press(v, 'b')).toBe(true)
    expect(v.state.doc.toString()).toBe('**hi**')
  })

  it('every shortcut has a label for the shortcuts sheet', () => {
    expect(MARKDOWN_SHORTCUTS.length).toBeGreaterThanOrEqual(12)
    for (const s of MARKDOWN_SHORTCUTS) expect(s.label).toBeTruthy()
  })
})

function runKey(v: EditorView, key: string): boolean {
  const s = MARKDOWN_SHORTCUTS.find((x) => x.key === key)
  if (!s) throw new Error(`no binding ${key}`)
  return s.run(v)
}
