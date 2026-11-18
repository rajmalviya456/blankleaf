/**
 * @uiw/react-codemirror always imports CodeMirror's "basic setup" and One Dark theme. Blankleaf
 * builds its own setup (basicSetup={false}), so they're replaced with these to keep them, and
 * the autocomplete and lint packages they pull in, out of the startup download.
 */
import type { Extension } from '@codemirror/state'

export const basicSetup = (): Extension[] => []
export const minimalSetup = (): Extension[] => []
export const oneDark: Extension = []
export const oneDarkTheme: Extension = []
export const oneDarkHighlightStyle = undefined
export const color = {}
