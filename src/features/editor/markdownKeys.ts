/**
 * Word-style formatting keys for Markdown notes. They write Markdown (`**bold**`, `## `…), so the
 * note stays plain text; each is one undo step. Loaded with the Markdown language.
 */
import { Prec } from '@codemirror/state'
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

export const markdownKeys = Prec.high(
  keymap.of(MARKDOWN_SHORTCUTS.map(({ key, run }) => ({ key, run, preventDefault: true }))),
)
