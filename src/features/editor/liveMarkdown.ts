/**
 * "Formatted while you type" for Markdown notes. The note's text never changes: decorations
 * hide the Markdown marks (`**`, `#`, `>`, a link's address…) on every line except the ones
 * being edited, grow headings, draw bullets and rules, and turn `- [ ]` into a checkbox.
 * Only the lines on screen are decorated. Loaded lazily with the Markdown language.
 */
import { syntaxTree } from '@codemirror/language'
import type { EditorState, Range } from '@codemirror/state'
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from '@codemirror/view'

/** A link address safe to open from a click: web and mail only (never `javascript:`). */
export function safeLinkUrl(raw: string): string | null {
  try {
    const url = new URL(raw)
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

class BulletWidget extends WidgetType {
  eq() {
    return true
  }
  toDOM() {
    const span = document.createElement('span')
    span.className = 'cm-md-bullet'
    span.textContent = '•'
    return span
  }
}

class RuleWidget extends WidgetType {
  eq() {
    return true
  }
  toDOM() {
    const span = document.createElement('span')
    span.className = 'cm-md-hr'
    span.setAttribute('aria-hidden', 'true')
    return span
  }
}

class CheckWidget extends WidgetType {
  readonly checked: boolean
  constructor(checked: boolean) {
    super()
    this.checked = checked
  }
  eq(other: CheckWidget) {
    return other.checked === this.checked
  }
  toDOM() {
    const box = document.createElement('input')
    box.type = 'checkbox'
    box.className = 'cm-md-check'
    box.checked = this.checked
    box.setAttribute('aria-label', this.checked ? 'Done' : 'Not done')
    return box
  }
  ignoreEvent() {
    // The plugin's mousedown handler toggles it.
    return false
  }
}

const bullet = Decoration.replace({ widget: new BulletWidget() })
const rule = Decoration.replace({ widget: new RuleWidget() })
const hide = Decoration.replace({})
const code = Decoration.mark({ class: 'cm-md-code' })

/** Lines that have a cursor or selection on them: their marks stay visible for editing. */
function activeLines(state: EditorState): Set<number> {
  const out = new Set<number>()
  for (const r of state.selection.ranges) {
    const first = state.doc.lineAt(r.from).number
    const last = state.doc.lineAt(r.to).number
    for (let n = first; n <= last; n++) out.add(n)
  }
  return out
}

function build(view: EditorView): DecorationSet {
  const { state } = view
  const { doc } = state
  const active = activeLines(state)
  const isActive = (pos: number) => active.has(doc.lineAt(pos).number)
  const marks: Range<Decoration>[] = []
  const lineClasses = new Map<number, Set<string>>()
  const addLine = (pos: number, cls: string) => {
    const from = doc.lineAt(pos).from
    const set = lineClasses.get(from) ?? new Set<string>()
    set.add(cls)
    lineClasses.set(from, set)
  }
  /** Hide `from..to`, plus one following space when `withSpace`, on lines not being edited. */
  const hideMark = (from: number, to: number, withSpace = false) => {
    if (isActive(from)) return
    if (withSpace && doc.sliceString(to, to + 1) === ' ') to++
    if (to > from) marks.push(hide.range(from, to))
  }

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(state).iterate({
      from,
      to,
      enter: (node) => {
        const name = node.name
        if (name === 'FencedCode' || name === 'CodeBlock' || name === 'HTMLBlock') return false
        const heading = /^ATXHeading([1-6])$/.exec(name)
        if (heading) {
          addLine(node.from, `cm-md-h${heading[1]}`)
          return
        }
        switch (name) {
          case 'HeaderMark':
            if (node.node.parent?.name.startsWith('ATXHeading')) hideMark(node.from, node.to, true)
            return
          case 'EmphasisMark':
          case 'StrikethroughMark':
            hideMark(node.from, node.to)
            return
          case 'InlineCode':
            marks.push(code.range(node.from, node.to))
            return
          case 'CodeMark':
            if (node.node.parent?.name === 'InlineCode') hideMark(node.from, node.to)
            return
          case 'Blockquote':
            for (let p = node.from; p <= node.to;) {
              const line = doc.lineAt(p)
              addLine(line.from, 'cm-md-quote')
              p = line.to + 1
            }
            return
          case 'QuoteMark':
            hideMark(node.from, node.to, true)
            return
          case 'HorizontalRule':
            if (!isActive(node.from)) marks.push(rule.range(node.from, node.to))
            return
          case 'ListMark': {
            const item = node.node.parent
            if (item?.parent?.name !== 'BulletList') return
            const task = item.getChild('Task')
            if (task) hideMark(node.from, node.to, true)
            else if (!isActive(node.from)) marks.push(bullet.range(node.from, node.to))
            return
          }
          case 'TaskMarker': {
            const checked = /x/i.test(doc.sliceString(node.from, node.to))
            marks.push(
              Decoration.replace({ widget: new CheckWidget(checked) }).range(node.from, node.to),
            )
            if (checked) addLine(node.from, 'cm-md-done')
            return
          }
          case 'Link': {
            const url = node.node.getChild('URL')
            // `[text]` with no address (and `[[note links]]`) stays as typed.
            if (!url) return
            const linkMarks = node.node.getChildren('LinkMark')
            const open = linkMarks[0]
            const close = linkMarks[1]
            if (!open || !close) return
            const href = doc.sliceString(url.from, url.to)
            if (close.from > open.to)
              marks.push(
                Decoration.mark({
                  class: 'cm-md-link',
                  attributes: { 'data-href': href },
                }).range(open.to, close.from),
              )
            hideMark(open.from, open.to)
            hideMark(close.from, node.to)
            return false
          }
        }
      },
    })
  }
  for (const [from, classes] of lineClasses)
    marks.push(Decoration.line({ class: [...classes].join(' ') }).range(from))
  return Decoration.set(marks, true)
}

/** Toggle the `[ ]` / `[x]` that starts at `pos`. */
function toggleTask(view: EditorView, pos: number): boolean {
  const marker = view.state.sliceDoc(pos, pos + 3)
  if (!/^\[[ xX]\]$/.test(marker)) return false
  view.dispatch({
    changes: { from: pos + 1, to: pos + 2, insert: marker[1] === ' ' ? 'x' : ' ' },
    userEvent: 'input.toggle',
  })
  return true
}

const plugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) {
      this.decorations = build(view)
    }
    update(u: ViewUpdate) {
      if (
        u.docChanged ||
        u.viewportChanged ||
        u.selectionSet ||
        syntaxTree(u.startState) !== syntaxTree(u.state)
      )
        this.decorations = build(u.view)
    }
  },
  {
    decorations: (p) => p.decorations,
    eventHandlers: {
      mousedown(e, view) {
        const target = e.target as HTMLElement
        if (target instanceof HTMLInputElement && target.classList.contains('cm-md-check')) {
          e.preventDefault()
          return toggleTask(view, view.posAtDOM(target))
        }
        const link = target.closest<HTMLElement>('.cm-md-link')
        if (link && (e.metaKey || e.ctrlKey)) {
          const url = safeLinkUrl(link.dataset.href ?? '')
          if (!url) return false
          e.preventDefault()
          window.open(url, '_blank', 'noopener')
          return true
        }
        return false
      },
    },
  },
)

const theme = EditorView.baseTheme({
  '.cm-md-h1, .cm-md-h2, .cm-md-h3, .cm-md-h4, .cm-md-h5, .cm-md-h6': { fontWeight: '650' },
  '.cm-md-h1': { fontSize: '1.6em', lineHeight: '1.3' },
  '.cm-md-h2': { fontSize: '1.35em', lineHeight: '1.35' },
  '.cm-md-h3': { fontSize: '1.17em' },
  '.cm-md-bullet': { color: 'var(--fg-muted)', padding: '0 0.15em' },
  '.cm-md-check': {
    margin: '0 0.1em 0 0',
    verticalAlign: '-0.1em',
    cursor: 'pointer',
    accentColor: 'var(--accent)',
  },
  '.cm-md-done': { color: 'var(--fg-faint)', textDecoration: 'line-through' },
  '.cm-md-quote': { borderLeft: '3px solid var(--border)', paddingLeft: '11px !important' },
  '.cm-md-code': {
    backgroundColor: 'var(--bg-sunken)',
    borderRadius: '3px',
    padding: '0 0.2em',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.92em',
  },
  '.cm-md-link': { color: 'var(--accent)', textDecoration: 'underline', cursor: 'text' },
  '.cm-md-hr': {
    display: 'inline-block',
    width: '100%',
    height: '0',
    borderTop: '1px solid var(--border)',
    verticalAlign: 'middle',
  },
})

export const liveMarkdown = [plugin, theme]
