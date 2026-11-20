/**
 * Collapsing in Markdown notes: an arrow beside each heading (and fenced code block or long list)
 * hides its section up to the next heading of the same or a higher level. The hidden part shows
 * as a … chip; clicking it, or moving the cursor or a find match into it, opens it again.
 * Folds live in the editor state only, so the note's text never changes. Loaded with the
 * Markdown language.
 *
 * Keys are the same as in code notes (CodeMirror's): Ctrl+Shift+[ / ] folds and unfolds, Ctrl+Alt+[ / ]
 * does every section. On a Mac folding is ⌘⌥[ / ], since ⌘⇧[ is the browser's previous-tab key.
 */
import { codeFolding, foldGutter, foldKeymap } from '@codemirror/language'
import type { Extension } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'

function marker(open: boolean): HTMLElement {
  const el = document.createElement('span')
  el.className = open ? 'cm-md-fold' : 'cm-md-fold cm-md-folded'
  el.textContent = open ? '▾' : '▸'
  el.title = open ? 'Collapse' : 'Expand'
  return el
}

function placeholder(_view: EditorView, onclick: (e: Event) => void): HTMLElement {
  const el = document.createElement('button')
  el.type = 'button'
  el.className = 'cm-foldPlaceholder'
  el.textContent = '…'
  el.setAttribute('aria-label', 'Show collapsed lines')
  el.title = 'Show collapsed lines'
  el.onclick = onclick
  return el
}

const theme = EditorView.baseTheme({
  '.cm-foldGutter .cm-gutterElement': {
    padding: '0 2px',
    cursor: 'pointer',
    color: 'var(--fg-faint)',
  },
  '.cm-md-fold': {
    display: 'inline-block',
    width: '1em',
    textAlign: 'center',
    fontSize: '0.8em',
    opacity: '0',
    transition: 'opacity 120ms',
  },
  // Laptop: arrows show while the pointer is over the note; a collapsed one always shows.
  '&:hover .cm-md-fold, .cm-md-fold.cm-md-folded': { opacity: '1' },
  '.cm-md-fold:hover': { color: 'var(--fg)' },
  // Outranks CodeMirror's own light/dark chip colours, so it follows the app's theme.
  '&.cm-editor .cm-content .cm-foldPlaceholder': {
    margin: '0 4px',
    padding: '0 6px',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    background: 'var(--bg-sunken)',
    color: 'var(--fg-muted)',
    font: 'inherit',
    lineHeight: '1.2',
    cursor: 'pointer',
  },
})

export const markdownFold: Extension = [
  codeFolding({ placeholderDOM: placeholder }),
  foldGutter({ markerDOM: marker }),
  keymap.of(foldKeymap),
  theme,
]
