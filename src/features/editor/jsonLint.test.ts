import { diagnosticCount, forEachDiagnostic, forceLinting, type Diagnostic } from '@codemirror/lint'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { describe, expect, it } from 'vitest'
import { loadLanguage } from './languages'

async function diagnostics(doc: string) {
  const view = new EditorView({
    state: EditorState.create({ doc, extensions: [(await loadLanguage('json'))!] }),
  })
  forceLinting(view)
  await new Promise((r) => setTimeout(r, 50))
  const found: Diagnostic[] = []
  forEachDiagnostic(view.state, (d) => found.push(d))
  view.destroy()
  return found
}

async function lint(doc: string) {
  const view = new EditorView({
    state: EditorState.create({ doc, extensions: [(await loadLanguage('json'))!] }),
  })
  forceLinting(view)
  await new Promise((r) => setTimeout(r, 50))
  const count = diagnosticCount(view.state)
  view.destroy()
  return count
}

describe('JSON notes', () => {
  it('mark a syntax error as you type', async () => {
    expect(await lint('{\n  "a": 1,\n  "b": \n}')).toBe(1)
  })

  it('mark nothing when the JSON is valid', async () => {
    expect(await lint('{\n  "a": 1\n}')).toBe(0)
  })

  it('mark the error where it is, even when the browser doesn’t say', async () => {
    // Chrome reports "Unexpected token ']'" with no position for a trailing comma.
    const doc = '{"tags": [1, 2,]}'
    const [d] = await diagnostics(doc)
    expect(d.from).toBeGreaterThanOrEqual(doc.indexOf(','))
    expect(d.from).toBeLessThanOrEqual(doc.indexOf(']'))
    expect(d.message).toMatch(/^Not valid JSON/)
  })

  it('leave an empty note alone', async () => {
    expect(await lint('')).toBe(0)
  })
})
