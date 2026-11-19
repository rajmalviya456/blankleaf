/**
 * `[[Title]]` links in the editor: styled as links, an Open/Create button when the cursor is
 * inside one (works on phones, which have no Cmd/Ctrl+click), Cmd/Ctrl+click to open, and note
 * title suggestions after typing `[[`. The suggestion code loads the first time `[[` is typed.
 */
import { Compartment, StateField, type EditorState, type Extension } from '@codemirror/state'
import {
  Decoration,
  EditorView,
  MatchDecorator,
  ViewPlugin,
  showTooltip,
  type DecorationSet,
  type Tooltip,
  type ViewUpdate,
} from '@codemirror/view'
import { linkExists, openLink } from './openLink'

const LINK = /\[\[([^[\]\n]+)\]\]/g
const linkMark = Decoration.mark({ class: 'np-note-link' })

const decorator = new MatchDecorator({
  regexp: LINK,
  decoration: (m) => (m[1].trim() ? linkMark : null),
})

const highlightLinks = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) {
      this.decorations = decorator.createDeco(view)
    }
    update(u: ViewUpdate) {
      this.decorations = decorator.updateDeco(u, this.decorations)
    }
  },
  { decorations: (v) => v.decorations },
)

/** The link around `pos` (strictly inside its brackets' span), if any. */
function linkAt(state: EditorState, pos: number) {
  const line = state.doc.lineAt(pos)
  for (const m of line.text.matchAll(LINK)) {
    const from = line.from + m.index
    const to = from + m[0].length
    const title = m[1].trim()
    if (title && pos > from && pos < to) return { title, from, to }
  }
  return null
}

function tooltipFor(state: EditorState): Tooltip | null {
  const sel = state.selection.main
  if (!sel.empty) return null
  const link = linkAt(state, sel.head)
  if (!link) return null
  return {
    pos: link.from,
    above: false,
    create: () => {
      const dom = document.createElement('div')
      dom.className = 'np-link-tip'
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = `${linkExists(link.title) ? 'Open' : 'Create'} “${link.title}”`
      // Keep the editor's focus and selection until the click lands.
      button.addEventListener('mousedown', (e) => e.preventDefault())
      button.addEventListener('click', () => openLink(link.title))
      dom.append(button)
      return { dom }
    },
  }
}

const linkTooltip = StateField.define<Tooltip | null>({
  create: tooltipFor,
  update: (tip, tr) => (tr.docChanged || tr.selection ? tooltipFor(tr.state) : tip),
  provide: (f) => showTooltip.from(f),
})

const modClick = EditorView.domEventHandlers({
  click(e, view) {
    if (!(e.metaKey || e.ctrlKey)) return false
    const pos = view.posAtCoords({ x: e.clientX, y: e.clientY })
    const link = pos === null ? null : linkAt(view.state, pos)
    if (!link) return false
    e.preventDefault()
    openLink(link.title)
    return true
  },
})

/** Note title suggestions, added the first time `[[` is typed in this editor. */
function suggestOnBrackets(noteId: string): Extension {
  const slot = new Compartment()
  let loaded = false
  const trigger = EditorView.inputHandler.of((view, from, _to, text) => {
    if (text !== '[' || view.state.sliceDoc(from - 1, from) !== '[') return false
    void import('./linkComplete').then((m) => {
      if (!loaded) {
        loaded = true
        view.dispatch({ effects: slot.reconfigure(m.linkCompletion(noteId)) })
      }
      m.startCompletion(view)
    })
    return false
  })
  return [slot.of([]), trigger]
}

export function noteLinks(noteId: string): Extension {
  return [highlightLinks, linkTooltip, modClick, suggestOnBrackets(noteId)]
}
