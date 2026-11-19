import { indentUnit } from '@codemirror/language'
import { EditorState, type Extension } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import type { LanguageId } from '../../domain/types'
import { newlineKeepingIndent } from './keepIndent'
import { loadLanguage } from './languages'

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

  it('a blank line between indented lines keeps the indent', async () => {
    expect(await enter('javascript', 'function a() {\n      |')).toBe('function a() {\n\n      |')
  })
})
