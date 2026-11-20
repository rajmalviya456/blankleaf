/**
 * Markdown tables: Tab in a table lines up its columns (keeping each column's :--- / :-: / --:
 * alignment) and moves to the next cell; Shift+Tab moves back; Tab in the last cell adds a row.
 */
import { EditorSelection, Prec, type EditorState, type StateCommand } from '@codemirror/state'
import { keymap } from '@codemirror/view'
import { startsInFence } from '../spell/words'

type Align = 'none' | 'left' | 'center' | 'right'

const SEPARATOR = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/
/** Characters, not UTF-16 units: an emoji or accented letter counts once. */
const width = (s: string) => Array.from(s).length

/** Cell text of one row; `\|` stays inside its cell. */
export function splitRow(line: string): string[] {
  let s = line.trim()
  if (s.startsWith('|')) s = s.slice(1)
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1)
  return s.split(/(?<!\\)\|/).map((c) => c.trim())
}

const isSeparator = (line: string) => SEPARATOR.test(line) && line.includes('-')

function alignOf(cell: string): Align {
  const l = cell.startsWith(':')
  const r = cell.endsWith(':')
  return l && r ? 'center' : r ? 'right' : l ? 'left' : 'none'
}

function pad(text: string, w: number, align: Align): string {
  const gap = w - width(text)
  if (align === 'right') return ' '.repeat(gap) + text
  if (align === 'center') {
    const left = Math.floor(gap / 2)
    return ' '.repeat(left) + text + ' '.repeat(gap - left)
  }
  return text + ' '.repeat(gap)
}

function dashes(w: number, align: Align): string {
  if (align === 'center') return ':' + '-'.repeat(w - 2) + ':'
  if (align === 'right') return '-'.repeat(w - 1) + ':'
  if (align === 'left') return ':' + '-'.repeat(w - 1)
  return '-'.repeat(w)
}

/** The table's lines with every column padded to its widest cell. */
export function formatTable(lines: string[]): string[] {
  const rows = lines.map(splitRow)
  const sep = lines.findIndex(isSeparator)
  const cols = Math.max(...rows.map((r) => r.length))
  const aligns: Align[] = Array.from({ length: cols }, (_, i) =>
    sep >= 0 ? alignOf(rows[sep][i] ?? '') : 'none',
  )
  const widths = Array.from({ length: cols }, (_, i) =>
    Math.max(3, ...rows.map((r, j) => (j === sep ? 0 : width(r[i] ?? '')))),
  )
  return rows.map((r, j) => {
    const cells = widths.map((w, i) =>
      j === sep ? dashes(w, aligns[i]) : pad(r[i] ?? '', w, aligns[i]),
    )
    return `| ${cells.join(' | ')} |`
  })
}

/** The table around a line: its first and last line numbers, or null if it isn't in one. */
function tableAround(state: EditorState, lineNo: number): [number, number] | null {
  const { doc } = state
  const inTable = (n: number) => n >= 1 && n <= doc.lines && doc.line(n).text.includes('|')
  if (!inTable(lineNo)) return null
  let first = lineNo
  let last = lineNo
  while (inTable(first - 1)) first--
  while (inTable(last + 1)) last++
  // A table has a header and the line of dashes under it.
  if (last === first || !isSeparator(doc.line(first + 1).text)) return null
  if (startsInFence(doc.sliceString(0, doc.line(first).from), doc.line(first).from)) return null
  return [first, last]
}

/** Which cell of a row the cursor is in (0-based). */
function cellIndex(line: string, col: number): number {
  const before = line.slice(0, col)
  const pipes = (before.match(/(?<!\\)\|/g) ?? []).length
  return Math.max(0, pipes - (line.trimStart().startsWith('|') ? 1 : 0))
}

/** Where a cell's text starts in a formatted row. */
function cellStart(row: string, cell: number): number {
  let at = 0
  for (let i = 0; i <= cell; i++) at = row.indexOf('|', at) + 1
  return at + 1
}

export const tableTab =
  (dir: 1 | -1): StateCommand =>
  ({ state, dispatch }) => {
    const sel = state.selection.main
    const line = state.doc.lineAt(sel.head)
    const range = tableAround(state, line.number)
    if (!range || state.selection.ranges.length > 1) return false
    const [first, last] = range
    const lines: string[] = []
    for (let n = first; n <= last; n++) lines.push(state.doc.line(n).text)
    const rows = formatTable(lines)
    const cols = splitRow(rows[0]).length
    // Walk cells across rows, skipping the line of dashes.
    let row = line.number - first
    let cell = row === 1 ? 0 : cellIndex(line.text, sel.head - line.from) + dir
    if (row === 1) row += dir === 1 ? 1 : -1
    if (cell >= cols) {
      cell = 0
      row++
      if (row === 1) row++
    } else if (cell < 0) {
      cell = cols - 1
      row--
      if (row === 1) row--
    }
    if (row < 0) return true
    if (row >= rows.length) {
      // A new empty row, as wide as the others (the line of dashes has each column's width).
      const widths = splitRow(rows[1]).map(width)
      rows.push(`| ${widths.map((w) => ' '.repeat(w)).join(' | ')} |`)
    }
    const from = state.doc.line(first).from
    const text = rows.join('\n')
    const rowStart = rows.slice(0, row).reduce((n, r) => n + r.length + 1, 0)
    const anchor = from + rowStart + cellStart(rows[row], cell)
    dispatch(
      state.update({
        changes: { from, to: state.doc.line(last).to, insert: text },
        selection: EditorSelection.cursor(Math.min(anchor, from + text.length)),
        scrollIntoView: true,
        userEvent: 'input.table',
      }),
    )
    return true
  }

/** Tab and Shift+Tab inside Markdown tables (ahead of Tab's usual indent). */
export const tableKeys = Prec.high(
  keymap.of([
    { key: 'Tab', run: tableTab(1) },
    { key: 'Shift-Tab', run: tableTab(-1) },
  ]),
)
