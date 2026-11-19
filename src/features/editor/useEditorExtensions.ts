import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { indentOnInput, indentUnit } from '@codemirror/language'
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search'
import { EditorState, type Extension } from '@codemirror/state'
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from '@codemirror/view'
import { useMemo } from 'react'
import type { Settings } from '../../domain/types'
import { createFindPanel } from './findPanel'
import { newlineKeepingIndent } from './keepIndent'

interface Options {
  wrap: boolean
  /** Very large document: drop per-line decorations to stay responsive. */
  large?: boolean
  settings: Pick<
    Settings,
    | 'lineNumbers'
    | 'highlightActiveLine'
    | 'tabSize'
    | 'editorFontSize'
    | 'lineHeight'
    | 'editorFont'
  >
}

export function useEditorExtensions({ wrap, settings, large = false }: Options): Extension[] {
  const {
    lineNumbers: showNumbers,
    highlightActiveLine: activeLine,
    tabSize,
    editorFontSize,
    lineHeight,
    editorFont,
  } = settings
  return useMemo(() => {
    const ext: Extension[] = [
      history(),
      drawSelection(),
      search({ top: true, createPanel: createFindPanel }),
      EditorState.allowMultipleSelections.of(true),
      EditorState.tabSize.of(tabSize),
      indentUnit.of(' '.repeat(tabSize)),
      // A typed `}` (or the language's other closers) moves back to its opening line's indent.
      indentOnInput(),
      keymap.of([
        { key: 'Enter', run: newlineKeepingIndent },
        ...defaultKeymap,
        ...historyKeymap,
        ...searchKeymap,
        indentWithTab,
      ]),
      EditorView.contentAttributes.of({
        'aria-label': 'Note text',
        // Blankleaf checks spelling itself (features/spell): the browser's check lags behind the
        // editor's redraws, misses older words and flags code, so it stays off.
        spellcheck: 'false',
        autocorrect: 'off',
      }),
    ]
    if (showNumbers) ext.push(lineNumbers(), highlightActiveLineGutter())
    if (activeLine && !large) ext.push(highlightActiveLine())
    if (!large) ext.push(highlightSelectionMatches())
    if (wrap) ext.push(EditorView.lineWrapping)
    // Typography lives in a theme extension (not only CSS vars) so a change reconfigures
    // the view and CodeMirror re-measures line heights; otherwise the gutter drifts.
    ext.push(
      EditorView.theme({
        '.cm-scroller': {
          fontSize: `${editorFontSize}px`,
          lineHeight: String(lineHeight),
          fontFamily: editorFont === 'mono' ? 'var(--font-mono)' : 'var(--font-ui)',
        },
      }),
    )
    return ext
  }, [wrap, showNumbers, activeLine, tabSize, large, editorFontSize, lineHeight, editorFont])
}
