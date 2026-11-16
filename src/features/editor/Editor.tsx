import CodeMirror, { type ViewUpdate } from '@uiw/react-codemirror'
import type { EditorView } from '@codemirror/view'
import { useCallback, useEffect, useRef } from 'react'
import { getStore, useAppStore } from '../../store/store'
import { calmEditorTheme } from './theme'
import { useEditorExtensions } from './useEditorExtensions'

/**
 * CodeMirror bound to one note. Mount with `key={noteId}` so each tab gets a fresh
 * view whose selection and scroll are restored from the session.
 */
export function Editor({ noteId }: { noteId: string }) {
  const content = useAppStore((s) => s.notes[noteId]?.content ?? '')
  const wrap = useAppStore((s) => s.notes[noteId]?.wrap ?? true)
  const settings = useAppStore((s) => s.settings)
  const extensions = useEditorExtensions({ wrap, settings })
  const scrollCleanup = useRef<() => void>(() => {})

  const s = () => getStore().getState()

  const onCreateEditor = useCallback(
    (view: EditorView) => {
      const saved = s().session.perTab[noteId]
      if (saved) {
        const len = view.state.doc.length
        const clamp = (n: number) => Math.max(0, Math.min(n, len))
        view.dispatch({
          selection: { anchor: clamp(saved.anchor), head: clamp(saved.head) },
          scrollIntoView: saved.scrollTop === 0,
        })
        if (saved.scrollTop)
          requestAnimationFrame(() => (view.scrollDOM.scrollTop = saved.scrollTop))
      }
      let raf = 0
      const onScroll = () => {
        cancelAnimationFrame(raf)
        raf = requestAnimationFrame(() =>
          s().setViewState(noteId, { scrollTop: Math.round(view.scrollDOM.scrollTop) }),
        )
      }
      view.scrollDOM.addEventListener('scroll', onScroll, { passive: true })
      scrollCleanup.current = () => {
        cancelAnimationFrame(raf)
        view.scrollDOM.removeEventListener('scroll', onScroll)
      }
      view.focus()
    },
    [noteId],
  )

  useEffect(() => () => scrollCleanup.current(), [])

  const onChange = useCallback((value: string) => s().updateContent(noteId, value), [noteId])

  const onUpdate = useCallback(
    (u: ViewUpdate) => {
      if (!u.selectionSet) return
      const { anchor, head } = u.state.selection.main
      const prev = s().session.perTab[noteId]
      if (prev?.anchor !== anchor || prev?.head !== head) s().setViewState(noteId, { anchor, head })
    },
    [noteId],
  )

  return (
    <CodeMirror
      value={content}
      onChange={onChange}
      onUpdate={onUpdate}
      onCreateEditor={onCreateEditor}
      extensions={extensions}
      theme={calmEditorTheme}
      basicSetup={false}
      height="100%"
      className="h-full min-h-0 flex-1"
      style={
        {
          '--editor-font': settings.editorFont === 'mono' ? 'var(--font-mono)' : 'var(--font-ui)',
        } as React.CSSProperties
      }
      aria-label="Note editor"
    />
  )
}
