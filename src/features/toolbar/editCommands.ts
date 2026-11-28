/**
 * Toolbar edits. Each is one CodeMirror transaction, so ⌘Z undoes it in one step.
 * Inline/line commands act on the selection; with none they act at the cursor
 * (inline, case) or on the whole note (line tools).
 */
import {
  EditorSelection,
  type ChangeSpec,
  type EditorState,
  type Line,
  type SelectionRange,
} from '@codemirror/state'
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

/**
 * Lines touched by the selection ranges, as runs of adjacent lines, each line once. As in
 * CodeMirror, a range that ends at the very start of a line leaves that line out.
 */
function lineBlocks(
  state: EditorState,
  ranges: readonly SelectionRange[] = state.selection.ranges,
): Line[][] {
  const { doc } = state
  const blocks: Line[][] = []
  let upto = 0
  for (const r of ranges) {
    const first = doc.lineAt(r.from).number
    const last = doc.lineAt(!r.empty && doc.lineAt(r.to).from === r.to ? r.to - 1 : r.to).number
    if (!blocks.length || first > upto + 1) blocks.push([])
    for (let n = Math.max(first, upto + 1); n <= last; n++) blocks.at(-1)!.push(doc.line(n))
    upto = Math.max(upto, last)
  }
  return blocks
}

const HEADING = /^#{1,6} /

/** Set the current lines to heading `level` (0 clears it). */
export function setHeading(view: EditorView, level: number): boolean {
  const changes: ChangeSpec[] = lineBlocks(view.state)
    .flat()
    .map((line) => {
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

/** A line's indent and quote markers, then its list marker if it has one. */
const LIST = /^((?:[ \t]*>[ \t]?)*[ \t]*)([-*+] \[[ xX]\] |[-*+] |\d+\. )?/
const QUOTE = /^([ \t]*)> ?/

const kindOf = (marker = '') =>
  marker.includes('[') ? 'check' : /\d/.test(marker) ? 'number' : marker ? 'bullet' : ''

/**
 * Toggle a line prefix ('- ', '1. ', '- [ ] ', '> ') on the selected lines. If every line
 * already has it, remove it; otherwise replace any other list marker with it. A quote goes
 * around the whole line, list marker and all.
 */
export function toggleLinePrefix(view: EditorView, prefix: string): boolean {
  const blocks = lineBlocks(view.state)
  const lines = blocks.flat()
  const changes: ChangeSpec[] = []
  if (prefix === '> ') {
    const remove = lines.every((l) => QUOTE.test(l.text))
    for (const line of lines) {
      const m = QUOTE.exec(line.text)
      if (remove) changes.push({ from: line.from + m![1].length, to: line.from + m![0].length })
      else if (!m) changes.push({ from: line.from, insert: prefix })
    }
  } else {
    const kind = kindOf(prefix)
    const remove = lines.every((l) => kindOf(LIST.exec(l.text)![2]) === kind)
    // Each run of lines is its own list, numbered from 1.
    for (const block of blocks)
      block.forEach((line, i) => {
        const [, lead, marker = ''] = LIST.exec(line.text)!
        // A box that is already there stays as it is, ticked or not.
        const keep = kind === 'check' && kindOf(marker) === 'check'
        changes.push({
          from: line.from + lead.length,
          to: line.from + lead.length + marker.length,
          insert: remove ? '' : kind === 'number' ? `${i + 1}. ` : keep ? marker : prefix,
        })
      })
  }
  view.dispatch({ changes, userEvent: 'input.format' })
  return done(view)
}

/** Fence the selection (or an empty block) in ``` on its own lines. */
export function insertCodeBlock(view: EditorView): boolean {
  const { doc } = view.state
  const r = view.state.selection.main
  // Ending at the very start of a line: the newline before it stays outside the fence.
  const to = !r.empty && doc.lineAt(r.to).from === r.to ? r.to - 1 : r.to
  const body = doc.sliceString(r.from, to)
  const lead = r.from > 0 && doc.sliceString(r.from - 1, r.from) !== '\n' ? '\n' : ''
  const tail = to < doc.length && doc.sliceString(to, to + 1) !== '\n' ? '\n' : ''
  const open = `${lead}\`\`\`\n`
  const insert = `${open}${body}\n\`\`\`${tail}`
  const start = r.from + open.length
  view.dispatch({
    changes: { from: r.from, to, insert },
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

/** Rewrite each run of selected lines (whole note when nothing is selected) through `fn`. */
function mapLines(view: EditorView, fn: (lines: string[]) => string[]): boolean {
  const { state } = view
  const picked = state.selection.ranges.filter((r) => !r.empty)
  // The whole note as one range, so a final newline is left out and stays at the end.
  const whole = [EditorSelection.range(0, state.doc.length)]
  const changes: ChangeSpec[] = []
  let shift = 0
  const ranges = lineBlocks(state, picked.length ? picked : whole).map((lines) => {
    const { from } = lines[0]
    const { to } = lines.at(-1)!
    const insert = fn(lines.map((l) => l.text)).join('\n')
    if (insert !== state.sliceDoc(from, to)) changes.push({ from, to, insert })
    const range = EditorSelection.range(from + shift, from + shift + insert.length)
    shift += insert.length - (to - from)
    return range
  })
  if (!changes.length) return done(view)
  view.dispatch({
    changes,
    selection: picked.length ? EditorSelection.create(ranges) : undefined,
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
