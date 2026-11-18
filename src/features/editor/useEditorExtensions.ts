import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { indentUnit } from '@codemirror/language'
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

interface Options {
  wrap: boolean
  /** Let the browser underline misspelled words. */
  spellcheck?: boolean
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

export function useEditorExtensions({
  wrap,
  spellcheck = false,
  settings,
  large = false,
}: Options): Extension[] {
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
      keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
      EditorView.contentAttributes.of({
        'aria-label': 'Note text',
        spellcheck: spellcheck ? 'true' : 'false',
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
  }, [
    wrap,
    spellcheck,
    showNumbers,
    activeLine,
    tabSize,
    large,
    editorFontSize,
    lineHeight,
    editorFont,
  ])
}
