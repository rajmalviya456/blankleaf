/**
 * JSON notes underline their first syntax error as you type. Loaded with the JSON format only.
 * The browser's JSON.parse decides whether there is an error and words it; where it is comes
 * from the parse tree, since Chrome often leaves the position out ("Unexpected token ']'").
 */
import { syntaxTree } from '@codemirror/language'
import { linter, type Diagnostic } from '@codemirror/lint'
import type { EditorState } from '@codemirror/state'

/** "Unexpected token ']', ..."s": [1, 2,] " is not valid JSON" → "Unexpected token ']'". */
function shortMessage(e: unknown): string {
  const text = e instanceof Error ? e.message : String(e)
  return text.replace(/^JSON\.parse: /, '').split(/, "|\s+in JSON at position|\s+at line/)[0]
}

function positionFromMessage(e: unknown, state: EditorState): number | null {
  const text = e instanceof Error ? e.message : ''
  const at = /at position (\d+)/.exec(text)
  if (at) return Math.min(Number(at[1]), state.doc.length)
  const lc = /line (\d+) column (\d+)/.exec(text)
  if (lc && Number(lc[1]) <= state.doc.lines)
    return Math.min(state.doc.line(Number(lc[1])).from + Number(lc[2]) - 1, state.doc.length)
  return null
}

function firstTreeError(state: EditorState): number | null {
  let found: number | null = null
  syntaxTree(state).iterate({
    enter: (n) => {
      if (found !== null) return false
      if (n.type.isError) found = n.from
    },
  })
  return found
}

export function jsonDiagnostics(state: EditorState): Diagnostic[] {
  const text = state.doc.toString()
  if (!text.trim()) return []
  try {
    JSON.parse(text)
    return []
  } catch (e) {
    const pos = positionFromMessage(e, state) ?? firstTreeError(state) ?? state.doc.length
    const from = Math.max(0, Math.min(pos, state.doc.length))
    const to = Math.min(from + 1, state.doc.length)
    return [{ from, to, severity: 'error', message: `Not valid JSON: ${shortMessage(e)}` }]
  }
}

export const jsonLint = linter((view) => jsonDiagnostics(view.state), { delay: 400 })
