import { EditorSelection, EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { formatTable, splitRow, tableTab } from './markdownTable'

describe('splitRow', () => {
  it('reads cells with or without outer pipes, keeping escaped pipes', () => {
    expect(splitRow('| a | b |')).toEqual(['a', 'b'])
    expect(splitRow('a | b')).toEqual(['a', 'b'])
    expect(splitRow('| a \\| b | c |')).toEqual(['a \\| b', 'c'])
    expect(splitRow('|  | x |')).toEqual(['', 'x'])
  })
})

describe('formatTable', () => {
  it('lines up every column, padding to the widest cell', () => {
    expect(formatTable(['|Name|Qty|', '|-|-|', '|Apples|3|', '|Fig|12|'])).toEqual([
      '| Name   | Qty |',
      '| ------ | --- |',
      '| Apples | 3   |',
      '| Fig    | 12  |',
    ])
  })

  it('keeps each column’s alignment and pads to match it', () => {
    expect(formatTable(['| a | b | c |', '|:-|:-:|-:|', '| left | mid | 1 |'])).toEqual([
      '| a    |  b  |   c |',
      '| :--- | :-: | --: |',
      '| left | mid |   1 |',
    ])
  })

  it('fills short rows and widens the table for long ones', () => {
    expect(formatTable(['| a | b |', '| - | - |', '| 1 |', '| 1 | 2 | 3 |'])).toEqual([
      '| a   | b   |     |',
      '| --- | --- | --- |',
      '| 1   |     |     |',
      '| 1   | 2   | 3   |',
    ])
  })

  it('counts an emoji or accented letter as one character', () => {
    expect(formatTable(['| é | x |', '| - | - |', '| 😀 | yy |'])[2]).toBe('| 😀   | yy  |')
  })
})

function press(doc: string, cursor: number, dir: 1 | -1 = 1) {
  let state = EditorState.create({ doc, selection: EditorSelection.cursor(cursor) })
  const handled = tableTab(dir)({ state, dispatch: (tr) => (state = tr.state) })
  return { handled, doc: state.doc.toString(), at: state.selection.main.head, state }
}
const cellAt = (r: ReturnType<typeof press>) => r.doc.slice(r.at).split('|')[0].trim()

describe('Tab in a table', () => {
  const table = '|Name|Qty|\n|-|-|\n|Apples|3|'

  it('tidies the table and moves to the next cell, skipping the line under the header', () => {
    const r = press(table, 2)
    expect(r.handled).toBe(true)
    expect(r.doc).toBe('| Name   | Qty |\n| ------ | --- |\n| Apples | 3   |')
    expect(cellAt(r)).toBe('Qty')
    const next = press(r.doc, r.at)
    expect(cellAt(next)).toBe('Apples')
  })

  it('Shift+Tab goes back a cell', () => {
    const r = press(table, table.length - 2, -1)
    expect(cellAt(r)).toBe('Apples')
  })

  it('Tab in the last cell adds a new row', () => {
    const r = press(table, table.length - 1)
    expect(r.doc.split('\n')).toHaveLength(4)
    expect(r.doc.split('\n')[3]).toBe('|        |     |')
    expect(r.state.doc.lineAt(r.at).number).toBe(4)
  })

  it('Tab steps over an escaped pipe inside a cell', () => {
    const doc = '| x | y |\n| - | - |\n| a \\| b | c |'
    const r = press(doc, doc.indexOf('a \\|'))
    expect(cellAt(r)).toBe('c')
    // From the last cell, the next Tab adds a row instead of getting stuck.
    const next = press(r.doc, r.at)
    expect(next.state.doc.lineAt(next.at).number).toBe(4)
  })

  it('does nothing outside a table, or in a code block', () => {
    expect(press('just text | with a pipe', 3).handled).toBe(false)
    expect(press('```\n| a | b |\n| - | - |\n```', 6).handled).toBe(false)
  })
})
