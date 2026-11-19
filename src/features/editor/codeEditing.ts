import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { bracketMatching, codeFolding, foldGutter, foldKeymap } from '@codemirror/language'
import type { Extension } from '@codemirror/state'
import { keymap } from '@codemirror/view'

/**
 * Editing help for notes written as code: closing brackets and quotes, highlighting the
 * matching bracket, and folding blocks. Plain text and Markdown notes type exactly as typed.
 */
export const codeEditing: Extension = [
  closeBrackets(),
  bracketMatching(),
  codeFolding({ placeholderText: '…' }),
  foldGutter({ openText: '⌄', closedText: '›' }),
  keymap.of([...closeBracketsKeymap, ...foldKeymap]),
]
