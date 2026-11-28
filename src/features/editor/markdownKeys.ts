/**
 * Word-style formatting keys for Markdown notes. They write Markdown (`**bold**`, `## `…), so the
 * note stays plain text; each is one undo step. Loaded with the Markdown language.
 */
import { Prec, type EditorState, type Line } from '@codemirror/state'
import { keymap, type EditorView } from '@codemirror/view'
import { insertLink, setHeading, toggleInline, toggleLinePrefix } from '../toolbar/editCommands'

export interface MarkdownShortcut {
  /** CodeMirror key name (`Mod` is ⌘ on a Mac, Ctrl elsewhere). */
  key: string
  label: string
  run(view: EditorView): boolean
}

export const MARKDOWN_SHORTCUTS: readonly MarkdownShortcut[] = [
  { key: 'Mod-b', label: 'Bold', run: (v) => toggleInline(v, '**') },
  { key: 'Mod-i', label: 'Italic', run: (v) => toggleInline(v, '_') },
  { key: 'Mod-Shift-x', label: 'Strikethrough', run: (v) => toggleInline(v, '~~') },
  { key: 'Mod-e', label: 'Inline code', run: (v) => toggleInline(v, '`') },
  // Mod-K is the command palette, so links take Shift as well.
  { key: 'Mod-Shift-k', label: 'Link', run: insertLink },
  { key: 'Mod-Alt-1', label: 'Heading 1', run: (v) => setHeading(v, 1) },
  { key: 'Mod-Alt-2', label: 'Heading 2', run: (v) => setHeading(v, 2) },
  { key: 'Mod-Alt-3', label: 'Heading 3', run: (v) => setHeading(v, 3) },
  { key: 'Mod-Alt-0', label: 'Normal text', run: (v) => setHeading(v, 0) },
  { key: 'Mod-Shift-7', label: 'Numbered list', run: (v) => toggleLinePrefix(v, '1. ') },
  { key: 'Mod-Shift-8', label: 'Bulleted list', run: (v) => toggleLinePrefix(v, '- ') },
  { key: 'Mod-Shift-9', label: 'Checklist', run: (v) => toggleLinePrefix(v, '- [ ] ') },
]

/** How a shortcut reads to people: `⌘⇧K` on a Mac, `Ctrl+Shift+K` elsewhere. */
export function shortcutText(key: string, mac: boolean): string {
  const parts = key.split('-')
  const last = parts.pop()!.toUpperCase()
  if (mac) {
    const sym: Record<string, string> = { Mod: '⌘', Alt: '⌥', Shift: '⇧' }
    return parts.map((p) => sym[p] ?? p).join('') + last
  }
  const word: Record<string, string> = { Mod: 'Ctrl', Alt: 'Alt', Shift: 'Shift' }
  return [...parts.map((p) => word[p] ?? p), last].join('+')
}

/** Shortcut text for a toolbar button's tooltip, by its label (undefined when it has none). */
export function shortcutFor(label: string, mac: boolean): string | undefined {
  const s = MARKDOWN_SHORTCUTS.find((x) => x.label === label)
  return s && shortcutText(s.key, mac)
}

/** A list item's start: indent, marker (`-`, `*`, `+`, `1.`, `1)`), and the spaces after it. */
const ITEM = /^(\s*)([-*+]|\d+[.)])( +)/

/** The nearest list item above `line` whose indent passes `fits`, if the list goes that far. */
function itemAbove(state: EditorState, line: Line, fits: (indent: number) => boolean) {
  for (let n = line.number - 1; n >= 1; n--) {
    const text = state.doc.line(n).text
    if (!text.trim()) continue
    const m = ITEM.exec(text)
    if (m && fits(m[1].length)) return m
    // An unindented line that isn't an item ends the list; indented ones continue an item.
    if (!m && !/^\s/.test(text)) return null
  }
  return null
}

/** The list item the cursor is on, when the selection stays on one line. */
function currentItem(state: EditorState) {
  const { main } = state.selection
  const line = state.doc.lineAt(main.head)
  if (state.doc.lineAt(main.anchor).number !== line.number) return null
  const m = ITEM.exec(line.text)
  return m && { line, m }
}

/**
 * Tab on a list item nests it under the item above, indented to that item's text: three
 * spaces under `1. `, two under `- `. A plain indent of two spaces doesn't nest a numbered
 * item (Markdown needs the width of its marker). A nested numbered item starts its own list at 1.
 */
export const nestListItem = ({ state, dispatch }: EditorView): boolean => {
  const at = currentItem(state)
  if (!at) return false
  const { line, m } = at
  const parent = itemAbove(state, line, (indent) => indent <= m[1].length)
  if (!parent) return false
  const target = parent[1].length + parent[2].length + parent[3].length
  if (target <= m[1].length) return false
  const marker = /\d/.test(m[2]) ? `1${m[2].slice(-1)}` : m[2]
  dispatch(
    state.update({
      changes: {
        from: line.from,
        to: line.from + m[1].length + m[2].length,
        insert: ' '.repeat(target) + marker,
      },
      scrollIntoView: true,
      userEvent: 'input.indent',
    }),
  )
  return true
}

/** Shift+Tab on a nested list item moves it out to its parent's level. */
export const unnestListItem = ({ state, dispatch }: EditorView): boolean => {
  const at = currentItem(state)
  if (!at || !at.m[1].length) return false
  const { line, m } = at
  const parent = itemAbove(state, line, (indent) => indent < m[1].length)
  const target = parent ? parent[1].length : 0
  dispatch(
    state.update({
      changes: { from: line.from, to: line.from + m[1].length, insert: ' '.repeat(target) },
      scrollIntoView: true,
      userEvent: 'delete.dedent',
    }),
  )
  return true
}

export const markdownKeys = Prec.high(
  keymap.of([
    ...MARKDOWN_SHORTCUTS.map(({ key, run }) => ({ key, run, preventDefault: true })),
    // Off a list item these return false, and Tab indents (or tidies a table) as usual.
    { key: 'Tab', run: nestListItem, shift: unnestListItem },
  ]),
)
