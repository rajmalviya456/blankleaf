import { EditorView } from '@codemirror/view'

/** CodeMirror theme that only reads Calm CSS variables, so light/dark switch for free. */
export const calmEditorTheme = EditorView.theme({
  '&': {
    height: '100%',
    color: 'var(--fg)',
    backgroundColor: 'var(--bg)',
    fontSize: 'var(--editor-font-size)',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': {
    fontFamily: 'var(--editor-font)',
    lineHeight: 'var(--editor-line-height)',
    overflow: 'auto',
  },
  '.cm-content': { padding: '14px 0 40vh', caretColor: 'var(--accent)' },
  '.cm-line': { padding: '0 18px 0 14px' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--accent)', borderLeftWidth: '2px' },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, ::selection': {
    backgroundColor: 'var(--selection)',
  },
  // Only the editor with the cursor looks active: with two notes side by side, the other
  // one's highlighted line and selection would make it look like the one being edited.
  '.cm-selectionBackground': { backgroundColor: 'var(--bg-hover)' },
  '.cm-activeLine': { backgroundColor: 'transparent' },
  '&.cm-focused .cm-activeLine': { backgroundColor: 'var(--accent-soft)' },
  '.cm-gutters': {
    backgroundColor: 'var(--bg)',
    color: 'var(--fg-faint)',
    border: 'none',
    paddingLeft: '6px',
  },
  '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--fg-muted)' },
  '.cm-selectionMatch': { backgroundColor: 'var(--accent-soft)' },
  // Find matches: warm and clearly different from the blue text selection.
  '.cm-searchMatch': {
    backgroundColor: 'var(--find-match)',
    borderRadius: '2px',
    boxShadow: '0 0 0 1px var(--find-match)',
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: 'var(--find-current)',
    boxShadow: '0 0 0 1px var(--find-current-ring)',
  },
  // The find widget floats over the top-right corner instead of pushing text down.
  '.cm-panels': { backgroundColor: 'transparent', color: 'var(--fg)' },
  '.cm-panels.cm-panels-top': {
    position: 'absolute',
    top: '10px',
    right: '18px',
    left: 'auto',
    border: 'none',
    zIndex: '20',
  },
})
