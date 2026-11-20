/** Note title suggestions for `[[`. Loaded on demand by linkEditor. */
import {
  autocompletion,
  startCompletion,
  type Completion,
  type CompletionContext,
} from '@codemirror/autocomplete'
import type { Extension } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { documentTitle } from '../../domain/title'
import { getStore } from '../../store/store'

export { startCompletion }

function insertLink(view: EditorView, c: Completion, from: number, to: number) {
  // Replace through a `]]` already there (closed brackets in code notes, or a retyped link).
  const end = view.state.sliceDoc(to, to + 2) === ']]' ? to + 2 : to
  const insert = `${c.label}]]`
  view.dispatch({
    changes: { from, to: end, insert },
    selection: { anchor: from + insert.length },
    userEvent: 'input.complete',
  })
}

function titles(noteId: string) {
  return (context: CompletionContext) => {
    const typed = context.matchBefore(/\[\[[^[\]\n]*$/)
    if (!typed) return null
    const seen = new Set<string>()
    const options: Completion[] = []
    for (const n of Object.values(getStore().getState().notes).sort(
      (a, b) => b.updatedAt - a.updatedAt,
    )) {
      if (n.id === noteId || n.deletedAt !== null) continue
      const label = documentTitle(n)
      // A title with [ or ] can't be written as a link.
      if (/[[\]]/.test(label)) continue
      if (seen.has(label.toLowerCase())) continue
      seen.add(label.toLowerCase())
      options.push({ label, type: 'text', apply: insertLink })
    }
    return { from: typed.from + 2, options, validFor: /^[^[\]\n]*$/ }
  }
}

export function linkCompletion(noteId: string): Extension {
  return autocompletion({ override: [titles(noteId)], icons: false })
}
