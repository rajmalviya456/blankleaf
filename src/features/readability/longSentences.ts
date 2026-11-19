/** Marks sentences over 25 words in the editor, worked out a moment after typing stops. */
import { type Range } from '@codemirror/state'
import {
  Decoration,
  ViewPlugin,
  type DecorationSet,
  type EditorView,
  type ViewUpdate,
} from '@codemirror/view'
import { readability } from '../../domain/readability'

const mark = Decoration.mark({ class: 'np-long-sentence' })
const DELAY_MS = 300

export const longSentences = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    private timer: ReturnType<typeof setTimeout> | undefined
    private view: EditorView
    constructor(view: EditorView) {
      this.view = view
      this.decorations = this.compute()
    }
    update(u: ViewUpdate) {
      if (!u.docChanged) return
      this.decorations = this.decorations.map(u.changes)
      clearTimeout(this.timer)
      this.timer = setTimeout(() => {
        this.decorations = this.compute()
        this.view.dispatch({})
      }, DELAY_MS)
    }
    compute(): DecorationSet {
      const ranges: Range<Decoration>[] = readability(
        this.view.state.doc.toString(),
      ).longSentences.map((s) => mark.range(s.from, s.to))
      return Decoration.set(ranges, true)
    }
    destroy() {
      clearTimeout(this.timer)
    }
  },
  { decorations: (p) => p.decorations },
)
