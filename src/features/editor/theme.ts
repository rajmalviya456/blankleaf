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
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, ::selection':
    { backgroundColor: 'var(--selection)' },
  '.cm-activeLine': { backgroundColor: 'var(--accent-soft)' },
  '.cm-gutters': {
    backgroundColor: 'var(--bg)',
    color: 'var(--fg-faint)',
    border: 'none',
    paddingLeft: '6px',
  },
  '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--fg-muted)' },
  '.cm-selectionMatch': { backgroundColor: 'var(--accent-soft)' },
  '.cm-searchMatch': { backgroundColor: 'var(--accent-soft)', outline: '1px solid var(--accent)' },
  '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: 'var(--selection)' },
  '.cm-panels': {
    backgroundColor: 'var(--bg-elev)',
    color: 'var(--fg)',
    fontFamily: 'var(--font-ui)',
  },
  '.cm-panels.cm-panels-top': { borderBottom: '1px solid var(--border)' },
  '.cm-panel.cm-search': { padding: '6px 10px', fontSize: '12px' },
  '.cm-panel.cm-search input, .cm-panel.cm-search button': {
    fontFamily: 'var(--font-ui)',
    fontSize: '12px',
  },
  '.cm-textfield': {
    backgroundColor: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    color: 'var(--fg)',
  },
  '.cm-button': {
    backgroundImage: 'none',
    backgroundColor: 'var(--bg-hover)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    color: 'var(--fg)',
  },
})
