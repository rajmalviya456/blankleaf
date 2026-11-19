import type { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

/** A faint vertical line at `column` characters (drawn by CSS: no work while typing). */
export function columnRuler(column: number): Extension {
  return EditorView.editorAttributes.of({ class: 'np-ruler', style: `--np-ruler: ${column}ch` })
}
