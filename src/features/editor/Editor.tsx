import CodeMirror, { type ViewUpdate } from '@uiw/react-codemirror'
import type { EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { detectLanguage } from '../../domain/detectLanguage'
import { isLargeDoc } from '../../domain/languages'
import { calmSyntax } from './highlight'
import { loadLanguage } from './languages'
import type { LanguageId } from '../../domain/types'
import { getStore, useAppStore } from '../../store/store'
import { calmEditorTheme } from './theme'
import { useEditorExtensions } from './useEditorExtensions'
import { activeViewUpdated, releaseActiveView, setActiveView } from './activeView'

/** Loads the CodeMirror language for a format (lazy). Null while loading or when large. */
function useLanguageExtension(lang: LanguageId, large: boolean): Extension | null {
  const [loaded, setLoaded] = useState<{ lang: LanguageId; ext: Extension | null } | null>(null)
  useEffect(() => {
    if (large) return
    let alive = true
    void loadLanguage(lang).then((ext) => alive && setLoaded({ lang, ext }))
    return () => {
      alive = false
    }
  }, [lang, large])
  return !large && loaded?.lang === lang ? loaded.ext : null
}

/** While a note's format is 'auto', guess it from the content and save the guess. */
function useAutoDetect(noteId: string, lang: LanguageId, content: string) {
  const deferred = useDeferredValue(content)
  useEffect(() => {
    if (lang !== 'auto' || deferred.trim().length < 8) return
    const guess = detectLanguage(deferred)
    if (guess !== 'plaintext') getStore().getState().setLanguage(noteId, guess)
  }, [noteId, lang, deferred])
}

/**
 * CodeMirror bound to one note. Mount with `key={noteId}` so each tab gets a fresh
 * view whose selection and scroll are restored from the session.
 */
export function Editor({ noteId }: { noteId: string }) {
  const content = useAppStore((s) => s.notes[noteId]?.content ?? '')
  const wrap = useAppStore((s) => s.notes[noteId]?.wrap ?? true)
  const lang = useAppStore((s) => s.notes[noteId]?.language ?? 'auto')
  const settings = useAppStore((s) => s.settings)
  const large = isLargeDoc(content.length)
  const base = useEditorExtensions({ wrap, settings, large })
  const langExt = useLanguageExtension(lang, large)
  const extensions = useMemo(
    () => (langExt ? [...base, langExt, calmSyntax] : base),
    [base, langExt],
  )
  useAutoDetect(noteId, lang, content)
  const scrollCleanup = useRef<() => void>(() => {})
  const viewRef = useRef<EditorView | null>(null)
  const reveal = useAppStore((s) => (s.ui.reveal?.noteId === noteId ? s.ui.reveal : null))

  useEffect(() => {
    const view = viewRef.current
    if (!view || !reveal) return
    const len = view.state.doc.length
    const clamp = (n: number) => Math.max(0, Math.min(n, len))
    view.dispatch({
      selection: { anchor: clamp(reveal.from), head: clamp(reveal.to) },
      scrollIntoView: true,
    })
    view.focus()
  }, [reveal])

  const s = () => getStore().getState()

  const onCreateEditor = useCallback(
    (view: EditorView) => {
      viewRef.current = view
      setActiveView(view)
      const saved = s().session.perTab[noteId]
      if (saved) {
        const len = view.state.doc.length
        const clamp = (n: number) => Math.max(0, Math.min(n, len))
        view.dispatch({
          selection: { anchor: clamp(saved.anchor), head: clamp(saved.head) },
          scrollIntoView:
            saved.scrollTop === 0 || getStore().getState().ui.reveal?.noteId === noteId,
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

  useEffect(
    () => () => {
      scrollCleanup.current()
      if (viewRef.current) releaseActiveView(viewRef.current)
    },
    [],
  )

  const onChange = useCallback((value: string) => s().updateContent(noteId, value), [noteId])

  const onUpdate = useCallback(
    (u: ViewUpdate) => {
      if (u.docChanged || u.transactions.length) activeViewUpdated(u.view)
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
