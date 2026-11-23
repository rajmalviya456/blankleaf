import { EditorState, RangeSetBuilder, type Extension, type Text } from '@codemirror/state'
import {
  Decoration,
  EditorView,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view'

/**
 * Typewriter mode: while you type or move with the keys, the cursor's line stays in the middle
 * of the editor. Mouse selections are left alone, so dragging doesn't make the page jump.
 */
export const typewriter: Extension = [
  EditorState.transactionExtender.of((tr) => {
    if (!tr.selection && !tr.docChanged) return null
    if (!tr.isUserEvent('input') && !tr.isUserEvent('delete') && !tr.isUserEvent('select'))
      return null
    if (tr.isUserEvent('select.pointer')) return null
    return { effects: EditorView.scrollIntoView(tr.newSelection.main.head, { y: 'center' }) }
  }),
  EditorView.editorAttributes.of({ class: 'cm-typewriter' }),
  // Room below the last line, so it can sit in the middle too.
  EditorView.baseTheme({ '&.cm-typewriter .cm-content': { paddingBottom: '50vh' } }),
]

/** First and last line numbers of the paragraph (run of non-blank lines) around `line`. */
function paragraphAround(doc: Text, line: number): [number, number] {
  const blank = (n: number) => !doc.line(n).text.trim()
  if (blank(line)) return [line, line]
  let start = line
  let end = line
  while (start > 1 && !blank(start - 1)) start--
  while (end < doc.lines && !blank(end + 1)) end++
  return [start, end]
}

const dim = Decoration.line({ class: 'cm-dim' })

function dimOthers(view: EditorView): DecorationSet {
  const { doc } = view.state
  const [start, end] = paragraphAround(doc, doc.lineAt(view.state.selection.main.head).number)
  const builder = new RangeSetBuilder<Decoration>()
  for (const { from, to } of view.visibleRanges) {
    for (let pos = from; pos <= to;) {
      const line = doc.lineAt(pos)
      if (line.number < start || line.number > end) builder.add(line.from, line.from, dim)
      pos = line.to + 1
    }
  }
  return builder.finish()
}

/**
 * Focus mode: every paragraph except the one you're in is dimmed. Dimmed text uses the faint
 * text colour, which still meets 4.5:1 contrast, so it stays readable.
 */
export const focusMode: Extension = [
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet
      constructor(view: EditorView) {
        this.decorations = dimOthers(view)
      }
      update(u: ViewUpdate) {
        if (u.docChanged || u.selectionSet || u.viewportChanged)
          this.decorations = dimOthers(u.view)
      }
    },
    { decorations: (p) => p.decorations },
  ),
  EditorView.baseTheme({
    '.cm-line.cm-dim, .cm-line.cm-dim *': { color: 'var(--fg-faint) !important' },
    '.cm-line.cm-dim': { transition: 'color 150ms' },
  }),
]
