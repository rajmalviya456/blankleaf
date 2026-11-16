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

interface Options {
  wrap: boolean
  settings: Pick<Settings, 'lineNumbers' | 'highlightActiveLine' | 'tabSize'>
}

export function useEditorExtensions({ wrap, settings }: Options): Extension[] {
  const { lineNumbers: showNumbers, highlightActiveLine: activeLine, tabSize } = settings
  return useMemo(() => {
    const ext: Extension[] = [
      history(),
      drawSelection(),
      search({ top: true }),
      highlightSelectionMatches(),
      EditorState.allowMultipleSelections.of(true),
      EditorState.tabSize.of(tabSize),
      indentUnit.of(' '.repeat(tabSize)),
      keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
    ]
    if (showNumbers) ext.push(lineNumbers(), highlightActiveLineGutter())
    if (activeLine) ext.push(highlightActiveLine())
    if (wrap) ext.push(EditorView.lineWrapping)
    return ext
  }, [wrap, showNumbers, activeLine, tabSize])
}
