import { indentUnit } from '@codemirror/language'
import { EditorState, type Extension } from '@codemirror/state'
import { renderHook } from '@testing-library/react'
import { EditorView } from '@codemirror/view'
import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../../domain/defaults'
import type { LanguageId } from '../../domain/types'
import { newlineKeepingIndent } from './keepIndent'
import { loadLanguage } from './languages'
import { useEditorExtensions } from './useEditorExtensions'

/** Presses Enter at `|` and returns the document, with the cursor shown as `|`. */
async function enter(lang: LanguageId, doc: string, unit = '    '): Promise<string> {
  const at = doc.indexOf('|')
  const ext: Extension = (await loadLanguage(lang)) ?? []
  let state = EditorState.create({
    doc: doc.replace('|', ''),
    selection: { anchor: at },
    extensions: [indentUnit.of(unit), ext],
  })
  newlineKeepingIndent({ state, dispatch: (tr) => (state = tr.state) })
  const head = state.selection.main.head
  return state.sliceDoc(0, head) + '|' + state.sliceDoc(head)
}

describe('Enter keeps the indent you typed', () => {
  it('a step in after a tab-indented line keeps the tabs and adds one indent unit', async () => {
    expect(await enter('javascript', 'function f() {\n\tif (x) {|')).toBe(
      'function f() {\n\tif (x) {\n\t    |',
    )
  })

  it('plain text copies the line above', async () => {
    expect(await enter('plaintext', '      text|')).toBe('      text\n      |')
  })

  it('JavaScript keeps a 6-space indent instead of resetting it', async () => {
    expect(await enter('javascript', 'function a() {\n      let x = 1|')).toBe(
      'function a() {\n      let x = 1\n      |',
    )
  })

  it('JavaScript adds one step after an opening brace', async () => {
    expect(await enter('javascript', '  if (x) {|', '  ')).toBe('  if (x) {\n    |')
  })

  it('JavaScript splits braces: inner line one step in, closing brace at the line’s indent', async () => {
    expect(await enter('javascript', '      if (x) {|}')).toBe(
      '      if (x) {\n          |\n      }',
    )
  })

  it('Python keeps an 8-space body', async () => {
    expect(await enter('python', 'def a():\n        x = 1|')).toBe(
      'def a():\n        x = 1\n        |',
    )
  })

  it('Python adds one step after a colon', async () => {
    expect(await enter('python', '  def a():|')).toBe('  def a():\n      |')
  })

  it('JSON keeps the indent of the line above', async () => {
    expect(await enter('json', '{\n  "a": 1,|')).toBe('{\n  "a": 1,\n  |')
  })

  it('SQL keeps the indent of the line above', async () => {
    expect(await enter('sql', 'select\n      a,|')).toBe('select\n      a,\n      |')
  })

  it('never takes indent away: a Python return keeps its line’s indent', async () => {
    expect(await enter('python', 'def a():\n      return 1|')).toBe(
      'def a():\n      return 1\n      |',
    )
  })

  it('copies a tab indent as tabs, not the indent unit’s spaces', async () => {
    expect(await enter('plaintext', 'all:\n\tgo build|')).toBe('all:\n\tgo build\n\t|')
    expect(await enter('json', '{\n\t"a": 1,|', '  ')).toBe('{\n\t"a": 1,\n\t|')
    // Splitting braces: the closing one keeps the line's own tab.
    expect((await enter('javascript', '\tif (x) {|}')).split('\n')[2]).toBe('\t}')
  })

  it('a blank line between indented lines keeps the indent', async () => {
    expect(await enter('javascript', 'function a() {\n      |')).toBe('function a() {\n\n      |')
  })
})

describe('typing a closing bracket', () => {
  it('moves it back to the opening line’s indent', async () => {
    const { result } = renderHook(() =>
      useEditorExtensions({ wrap: false, settings: { ...DEFAULT_SETTINGS, tabSize: 2 } }),
    )
    const doc = '  if (x) {\n      go()\n      '
    const view = new EditorView({
      state: EditorState.create({
        doc,
        selection: { anchor: doc.length },
        extensions: [result.current, (await loadLanguage('javascript'))!],
      }),
    })
    view.dispatch(view.state.replaceSelection('}'), { userEvent: 'input.type' })
    expect(view.state.doc.toString()).toBe('  if (x) {\n      go()\n  }')
    view.destroy()
  })
})
