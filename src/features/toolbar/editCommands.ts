/**
 * Toolbar edits. Each is one CodeMirror transaction, so ⌘Z undoes it in one step.
 * Inline/line commands act on the selection; with none they act at the cursor
 * (inline, case) or on the whole note (line tools).
 */
import { EditorSelection, type ChangeSpec, type Line } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'

function done(view: EditorView) {
  view.focus()
  return true
}

/** Wrap or unwrap each selection in `mark` (e.g. `**` for bold). */
export function toggleInline(view: EditorView, mark: string): boolean {
  const n = mark.length
  const tr = view.state.changeByRange((r) => {
    const doc = view.state.doc
    const before = doc.sliceString(Math.max(0, r.from - n), r.from)
    const after = doc.sliceString(r.to, r.to + n)
    if (before === mark && after === mark)
      return {
        changes: [
          { from: r.from - n, to: r.from },
          { from: r.to, to: r.to + n },
        ],
        range: EditorSelection.range(r.from - n, r.to - n),
      }
    return {
      changes: [
        { from: r.from, insert: mark },
        { from: r.to, insert: mark },
      ],
      range: EditorSelection.range(r.from + n, r.to + n),
    }
  })
  view.dispatch(tr, { userEvent: 'input.format' })
  return done(view)
}

/** Lines touched by the main selection. */
function selectedLines(view: EditorView): Line[] {
  const { doc, selection } = view.state
  const r = selection.main
  const first = doc.lineAt(r.from).number
  const last = doc.lineAt(r.to).number
  const out: Line[] = []
  for (let i = first; i <= last; i++) out.push(doc.line(i))
  return out
}

const HEADING = /^#{1,6} /

/** Set the current lines to heading `level` (0 clears it). */
export function setHeading(view: EditorView, level: number): boolean {
  const changes: ChangeSpec[] = selectedLines(view).map((line) => {
    const old = HEADING.exec(line.text)?.[0].length ?? 0
    return {
      from: line.from,
      to: line.from + old,
      insert: level > 0 ? '#'.repeat(level) + ' ' : '',
    }
  })
  view.dispatch({ changes, userEvent: 'input.format' })
  return done(view)
}

const LIST = /^(?:[-*+] \[[ xX]\] |[-*+] |\d+\. |> )/

/**
 * Toggle a line prefix ('- ', '1. ', '- [ ] ', '> ') on the selected lines. If every line
 * already has it, remove it; otherwise replace any other list prefix with it.
 */
export function toggleLinePrefix(view: EditorView, prefix: string): boolean {
  const numbered = prefix === '1. '
  const lines = selectedLines(view)
  const has = (l: Line) =>
    numbered
      ? /^\d+\. /.test(l.text)
      : l.text.startsWith(prefix) && LIST.exec(l.text)?.[0] === prefix
  const remove = lines.every(has)
  const changes: ChangeSpec[] = lines.map((line, i) => {
    const old = LIST.exec(line.text)?.[0].length ?? 0
    return {
      from: line.from,
      to: line.from + old,
      insert: remove ? '' : numbered ? `${i + 1}. ` : prefix,
    }
  })
  view.dispatch({ changes, userEvent: 'input.format' })
  return done(view)
}

/** Fence the selection (or an empty block) in ``` on its own lines. */
export function insertCodeBlock(view: EditorView): boolean {
  const { doc } = view.state
  const r = view.state.selection.main
  const body = doc.sliceString(r.from, r.to)
  const lead = r.from > 0 && doc.sliceString(r.from - 1, r.from) !== '\n' ? '\n' : ''
  const tail = r.to < doc.length && doc.sliceString(r.to, r.to + 1) !== '\n' ? '\n' : ''
  const open = `${lead}\`\`\`\n`
  const insert = `${open}${body}\n\`\`\`${tail}`
  const start = r.from + open.length
  view.dispatch({
    changes: { from: r.from, to: r.to, insert },
    selection: EditorSelection.range(start, start + body.length),
    userEvent: 'input.format',
  })
  return done(view)
}

/** Turn the selection into `[text](https://)` with the URL selected for typing. */
export function insertLink(view: EditorView): boolean {
  const r = view.state.selection.main
  const label = view.state.sliceDoc(r.from, r.to) || 'link'
  const insert = `[${label}](https://)`
  const urlFrom = r.from + label.length + 3
  view.dispatch({
    changes: { from: r.from, to: r.to, insert },
    selection: EditorSelection.range(urlFrom, urlFrom + 'https://'.length),
    userEvent: 'input.format',
  })
  return done(view)
}

export function insertText(view: EditorView, text: string): boolean {
  view.dispatch(view.state.replaceSelection(text), { userEvent: 'input' })
  return done(view)
}

export type CaseKind = 'upper' | 'lower' | 'title'

const recase = (s: string, kind: CaseKind) =>
  kind === 'upper'
    ? s.toUpperCase()
    : kind === 'lower'
      ? s.toLowerCase()
      : s
          .toLowerCase()
          .replace(/(^|[^\p{L}\p{N}'’])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase())

/** Change case of each selection, or of the word at the cursor. */
export function changeCase(view: EditorView, kind: CaseKind): boolean {
  const tr = view.state.changeByRange((r) => {
    const span = r.empty ? (view.state.wordAt(r.head) ?? r) : r
    const insert = recase(view.state.sliceDoc(span.from, span.to), kind)
    return {
      changes: { from: span.from, to: span.to, insert },
      range: r.empty ? r : EditorSelection.range(span.from, span.from + insert.length),
    }
  })
  view.dispatch(tr, { userEvent: 'input.format' })
  return done(view)
}

/** Rewrite the selected lines (whole note when nothing is selected) through `fn`. */
function mapLines(view: EditorView, fn: (lines: string[]) => string[]): boolean {
  const { doc, selection } = view.state
  const r = selection.main
  const from = r.empty ? 0 : doc.lineAt(r.from).from
  const to = r.empty ? doc.length : doc.lineAt(r.to).to
  const before = doc.sliceString(from, to)
  const after = fn(before.split('\n')).join('\n')
  if (after === before) return done(view)
  view.dispatch({
    changes: { from, to, insert: after },
    selection: r.empty ? undefined : EditorSelection.range(from, from + after.length),
    userEvent: 'input.format',
  })
  return done(view)
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
export const sortLines = (view: EditorView) =>
  mapLines(view, (ls) => [...ls].sort(collator.compare))
export const dedupeLines = (view: EditorView) => mapLines(view, (ls) => [...new Set(ls)])
/** Remove trailing spaces and tabs (indentation is kept). */
export const trimLines = (view: EditorView) =>
  mapLines(view, (ls) => ls.map((l) => l.replace(/[ \t]+$/, '')))
