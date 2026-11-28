import { getIndentation, IndentContext, indentString } from '@codemirror/language'
import {
  countColumn,
  EditorSelection,
  type EditorState,
  type StateCommand,
  Text,
} from '@codemirror/state'

const PAIRS: Record<string, string> = { '(': ')', '[': ']', '{': '}' }

/**
 * How far the language moves the next line in from the current one: one step after `{` or
 * `:`, none for an ordinary next line. Measured as if
 * the current line sat at the language's own indent, so the user's indent never skews it.
 */
function languageStep(state: EditorState, pos: number, split: boolean): number | null {
  const line = state.doc.lineAt(pos)
  const ws = /^\s*/.exec(line.text)![0]
  if (!/\S/.test(line.text.slice(0, pos - line.from))) return null
  const want = getIndentation(state, line.from)
  if (want == null) return null
  let s = state
  let at = pos
  const wanted = indentString(state, want)
  if (wanted !== ws) {
    s = state.update({
      changes: { from: line.from, to: line.from + ws.length, insert: wanted },
    }).state
    at = pos - ws.length + wanted.length
  }
  const next = getIndentation(
    new IndentContext(s, { simulateBreak: at, simulateDoubleBreak: split }),
    at,
  )
  // Steps back out are left to the user: some languages (SQL) wrongly drop to 0 mid-statement.
  return next == null ? null : Math.max(0, next - want)
}

/**
 * Enter that follows the indent you typed. A language's own rule would reset a 6-space line
 * to its 2 or 4; here the current line's indent is the base and the language only adds a step.
 */
export const newlineKeepingIndent: StateCommand = ({ state, dispatch }) => {
  if (state.readOnly) return false
  const changes = state.changeByRange((range) => {
    let { from, to } = range
    const line = state.doc.lineAt(from)
    const ws = /^\s*/.exec(line.text)![0]
    const split =
      from === to && PAIRS[state.sliceDoc(from - 1, from)] === state.sliceDoc(from, from + 1)
    const step = languageStep(state, from, split) ?? 0
    // The same indent is copied as typed, so tabs stay tabs; only a new step uses the indent unit.
    const indent = step ? indentString(state, countColumn(ws, state.tabSize) + step) : ws
    while (to < line.to && /\s/.test(line.text[to - line.from])) to++
    if (!split && from > line.from && !/\S/.test(line.text.slice(0, from - line.from)))
      from = line.from
    const insert = ['', indent]
    if (split) insert.push(ws)
    return {
      changes: { from, to, insert: Text.of(insert) },
      range: EditorSelection.cursor(from + 1 + insert[1].length),
    }
  })
  dispatch(state.update(changes, { scrollIntoView: true, userEvent: 'input' }))
  return true
}
