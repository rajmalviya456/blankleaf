import CodeMirror, { type ViewUpdate } from '@uiw/react-codemirror'
import type { EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { detectLanguage } from '../../domain/detectLanguage'
import { isLargeDoc, languageMeta } from '../../domain/languages'
import { detectStore } from './DetectChip'
import { noteLinks } from '../links/linkEditor'
import { useSpellCheck } from '../spell/useSpellCheck'
import { calmSyntax } from './highlight'
import { longSentences } from '../readability/longSentences'
import { readabilityStore } from '../readability/readabilityStore'
import { useStore } from 'zustand'
import { columnRuler } from './ruler'
import { loadLanguage } from './languages'
import type { LanguageId } from '../../domain/types'
import { getStore, useAppStore } from '../../store/store'
import { calmEditorTheme } from './theme'
import { useEditorExtensions } from './useEditorExtensions'
import { editorFontStack } from '../../domain/defaults'
import { useNoteFont } from './useNoteFont'
import { useNoteFontSize } from './useNoteFontSize'
import {
  activeViewUpdated,
  registerNoteView,
  releaseActiveView,
  setActiveView,
  setMainView,
  unregisterNoteView,
} from './activeView'
import { rememberState, restoreHistory } from './historyCache'

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
    if (guess === 'plaintext') return
    getStore().getState().setLanguage(noteId, guess)
    detectStore.getState().show(noteId, guess)
  }, [noteId, lang, deferred])
}

/**
 * CodeMirror bound to one note. Mount with `key={noteId}` so each tab gets a fresh
 * view whose selection and scroll are restored from the session. A `side` editor (the note
 * shown beside the active one) leaves the toolbar and keyboard focus with the main editor.
 */
export function Editor({ noteId, side = false }: { noteId: string; side?: boolean }) {
  const content = useAppStore((s) => s.notes[noteId]?.content ?? '')
  const wrap = useAppStore((s) => s.notes[noteId]?.wrap ?? true)
  const spellcheck = useAppStore((s) => s.notes[noteId]?.spellcheck ?? false)
  const lang = useAppStore((s) => s.notes[noteId]?.language ?? 'auto')
  const settings = useAppStore((s) => s.settings)
  const zen = useAppStore((s) => s.session.zen)
  const large = isLargeDoc(content.length)
  const fontSize = useNoteFontSize(noteId)
  const font = useNoteFont(noteId)
  const base = useEditorExtensions({
    wrap,
    // Zen: just the words, no line numbers or highlighted line.
    settings: {
      ...settings,
      editorFontSize: fontSize,
      editorFont: font,
      lineNumbers: settings.lineNumbers && !zen,
      highlightActiveLine: settings.highlightActiveLine && !zen,
    },
    large,
  })
  const langExt = useLanguageExtension(lang, large)
  const links = useMemo(() => noteLinks(noteId), [noteId])
  const longOn = useStore(readabilityStore, (r) => r.highlight && r.noteId === noteId)
  const rulerAt = languageMeta(lang).kind === 'code' ? settings.codeRuler : 0
  const ruler = useMemo(() => (rulerAt ? columnRuler(rulerAt) : null), [rulerAt])
  const spell = useSpellCheck(spellcheck && !large)
  const extensions = useMemo(() => {
    const ext = [...base, links]
    if (spell) ext.push(spell)
    if (longOn) ext.push(longSentences)
    if (ruler) ext.push(ruler)
    return langExt ? [...ext, langExt, calmSyntax] : ext
  }, [base, links, spell, ruler, longOn, langExt])
  useAutoDetect(noteId, lang, content)
  const scrollCleanup = useRef<() => void>(() => {})
  const viewRef = useRef<EditorView | null>(null)
  // Undo history from this note's previous editor, if the text hasn't changed since.
  const [initialState] = useState(() => restoreHistory(noteId, content))
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
      registerNoteView(noteId, view)
      if (side) {
        // The toolbar follows whichever note you're working in.
        view.contentDOM.addEventListener('focusin', () => {
          setActiveView(view)
          getStore().getState().setUi({ sideFocused: true })
        })
      } else {
        setMainView(view)
        view.contentDOM.addEventListener('focusin', () => {
          setActiveView(view)
          getStore().getState().setUi({ sideFocused: false })
        })
      }
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
      if (!side) view.focus()
    },
    [noteId, side],
  )

  useEffect(
    () => () => {
      scrollCleanup.current()
      if (viewRef.current) {
        releaseActiveView(viewRef.current)
        unregisterNoteView(noteId, viewRef.current)
      }
      if (side) getStore().getState().setUi({ sideFocused: false })
    },
    [side, noteId],
  )

  const onChange = useCallback((value: string) => s().updateContent(noteId, value), [noteId])

  const onUpdate = useCallback(
    (u: ViewUpdate) => {
      if (u.docChanged || u.transactions.length) {
        activeViewUpdated(u.view)
        rememberState(noteId, u.state)
      }
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
      initialState={initialState as Parameters<typeof CodeMirror>[0]['initialState']}
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
          '--editor-font': editorFontStack(font),
        } as React.CSSProperties
      }
    />
  )
}
