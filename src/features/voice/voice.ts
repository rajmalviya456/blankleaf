/**
 * Voice typing with the browser's speech recognition. Nothing about it appears in browsers that
 * don't support it. Browsers may send speech to their own service to transcribe it, so the first
 * use asks first (see VoiceConsentDialog). Blankleaf itself never receives any audio.
 */
import type { EditorView } from '@codemirror/view'
import { createStore } from 'zustand/vanilla'
import { editingNote } from '../../store/selectors'
import { getStore } from '../../store/store'
import { toast } from '../../ui/toast'
import { getActiveView, noteForView, viewForNote } from '../editor/activeView'

interface RecognitionEvent {
  resultIndex: number
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>
}
interface Recognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: RecognitionEvent) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}
type RecognitionClass = new () => Recognition

const recognitionClass = (): RecognitionClass | undefined => {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionClass
    webkitSpeechRecognition?: RecognitionClass
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

const UNAVAILABLE_KEY = 'blankleaf:voice-unavailable'

function remembered(key: string): boolean {
  try {
    return localStorage.getItem(key) === 'yes'
  } catch {
    return false
  }
}

function remember(key: string): void {
  try {
    localStorage.setItem(key, 'yes')
  } catch {
    // Private browsing: it simply asks or tries again next time.
  }
}

/** The browser's brand names, where it reports them (Chromium-based browsers do). */
const browserBrands = () =>
  (
    navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } }
  ).userAgentData?.brands.map((b) => b.brand)

const hasSpeechService = (brands: string[]) =>
  brands.some((b) => b === 'Google Chrome' || b === 'Microsoft Edge')

/**
 * Brave, Vivaldi, Opera and other Chromium browsers include the speech feature, but only Chrome
 * and Edge come with the service behind it: elsewhere every attempt fails with a network error.
 */
export function isVoiceSupported(): boolean {
  if (!recognitionClass() || remembered(UNAVAILABLE_KEY)) return false
  const brands = browserBrands()
  return !brands || hasSpeechService(brands)
}

export const voiceStore = createStore<{
  listening: boolean
  /** The note being dictated into (its pane shows the voice typing bubble). */
  noteId: string | null
  /** Words still being recognised, shown but not yet typed. */
  interim: string
  consentOpen: boolean
}>()(() => ({ listening: false, noteId: null, interim: '', consentOpen: false }))

const CONSENT_KEY = 'blankleaf:voice-consent'
const MAX_QUICK_RESTARTS = 3
const QUICK_MS = 1000

const PROBLEMS: Record<string, string> = {
  'not-allowed': 'Allow microphone access in your browser to use voice typing.',
  'service-not-allowed': 'Allow microphone access in your browser to use voice typing.',
  'audio-capture': 'No microphone was found.',
  'language-not-supported': 'Voice typing doesn’t support your browser’s language.',
}

/** A network error can mean being offline, a blocked service, or no service at all. */
function networkProblem(): string {
  if (!navigator.onLine) return 'You’re offline. Voice typing needs an internet connection.'
  const brands = browserBrands()
  if (brands && hasSpeechService(brands))
    return 'Voice typing couldn’t reach the speech service. Check your connection or VPN.'
  remember(UNAVAILABLE_KEY)
  return 'Voice typing isn’t available in this browser.'
}

let stopCurrent: (() => void) | null = null

export const stopVoice = () => stopCurrent?.()

/** Android's continuous mode repeats earlier words in later results: listen phrase by phrase. */
const isAndroid = () => /Android/i.test(navigator.userAgent)

/** Punctuation that sits against the word before it. */
const CLINGS = /^[,.;:!?%)\]}’”…]/

/**
 * Type dictated words at the cursor: spaced from the text around them (but not before
 * punctuation), and starting with a capital at the start of a line or after a full stop.
 */
export function insertDictated(view: EditorView, words: string) {
  const { from, to } = view.state.selection.main
  const lineStart = view.state.doc.lineAt(from).from
  const before = view.state.sliceDoc(lineStart, from)
  const after = view.state.sliceDoc(to, Math.min(view.state.doc.length, to + 1))
  let text = words
  if (/^\s*$/.test(before) || /[.!?]["”’)]?\s*$/.test(before))
    text = text.replace(/^\p{Ll}/u, (c) => c.toUpperCase())
  if (before && !/\s$/.test(before) && !CLINGS.test(text)) text = ' ' + text
  if (after && /[\p{L}\p{N}]/u.test(after)) text += ' '
  view.dispatch(view.state.replaceSelection(text), {
    userEvent: 'input.dictate',
    scrollIntoView: true,
  })
}

function start(view: EditorView) {
  const Recognition = recognitionClass()
  if (!Recognition || stopCurrent) return
  const recognition = new Recognition()
  recognition.lang = navigator.language
  recognition.continuous = !isAndroid()
  recognition.interimResults = true

  // The note whose editor this is (the side note when its editor has the cursor).
  const noteId = noteForView(view) ?? editingNote(getStore().getState())?.id ?? null
  let active = true
  let startedAt = 0
  let quickRestarts = 0
  /** What each result of this listening session typed: browsers may send one again. */
  let typed: string[] = []
  let interim = ''
  /** The note's editor now: a redraw (Edit → Split) replaces it, and typing carries on there. */
  const target = () => (noteId && viewForNote(noteId)) || (view.dom.isConnected ? view : null)

  /** `keep`: type the words still being heard, as shown (stopping by hand, leaving the page). */
  const stop = (keep = false) => {
    if (!active) return
    const v = target()
    if (keep && interim.trim() && v) insertDictated(v, interim.trim())
    active = false
    stopCurrent = null
    unsubscribe()
    document.removeEventListener('visibilitychange', onVisibility)
    voiceStore.setState({ listening: false, noteId: null, interim: '' })
    recognition.onresult = null
    recognition.abort()
  }
  const unsubscribe = getStore().subscribe((s) => {
    const note = noteId ? s.notes[noteId] : undefined
    const shown = s.session.activeTabId === noteId || s.session.splitNoteId === noteId
    if (!shown || !note || note.locked || note.deletedAt !== null) stop()
  })
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') stop(true)
  }
  const listen = () => {
    startedAt = Date.now()
    typed = []
    interim = ''
    recognition.start()
  }

  recognition.onresult = (e) => {
    const v = target()
    if (!active || !v) return stop()
    quickRestarts = 0
    interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const result = e.results[i]
      if (result.isFinal) {
        const words = result[0].transcript.trim()
        if (typed[i] === words) continue
        typed[i] = words
        if (words) insertDictated(v, words)
      } else interim += result[0].transcript
    }
    voiceStore.setState({ interim: interim.trim() })
  }
  recognition.onerror = ({ error }) => {
    const problem = error === 'network' ? networkProblem() : PROBLEMS[error]
    if (!problem) return // Silence and cancelled sessions just carry on.
    stop()
    toast(problem, { tone: 'warn' })
  }
  // Browsers end a session after each pause: keep going until the user stops.
  recognition.onend = () => {
    if (!active) return
    quickRestarts = Date.now() - startedAt < QUICK_MS ? quickRestarts + 1 : 0
    if (quickRestarts > MAX_QUICK_RESTARTS) {
      stop()
      toast('Voice typing stopped because the browser couldn’t keep listening.', { tone: 'warn' })
      return
    }
    try {
      listen()
    } catch {
      stop()
    }
  }

  stopCurrent = () => stop(true)
  document.addEventListener('visibilitychange', onVisibility)
  voiceStore.setState({ listening: true, noteId, interim: '' })
  try {
    listen()
  } catch {
    stop()
    toast('Voice typing couldn’t start. Please try again.', { tone: 'warn' })
  }
}

/** Start or stop. The first start asks for consent instead. */
export function toggleVoice(view: EditorView | null): void {
  if (voiceStore.getState().listening) return stopVoice()
  if (!view) return
  if (remembered(CONSENT_KEY)) start(view)
  else voiceStore.setState({ consentOpen: true })
}

export function acceptVoiceConsent(): void {
  remember(CONSENT_KEY)
  voiceStore.setState({ consentOpen: false })
  const view = getActiveView()
  if (view) start(view)
}
