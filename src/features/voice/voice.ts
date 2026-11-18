/**
 * Voice typing with the browser's speech recognition. Nothing about it appears in browsers that
 * don't support it. Browsers may send speech to their own service to transcribe it, so the first
 * use asks first (see VoiceConsentDialog). Blankleaf itself never receives any audio.
 */
import type { EditorView } from '@codemirror/view'
import { createStore } from 'zustand/vanilla'
import { getStore } from '../../store/store'
import { toast } from '../../ui/toast'
import { getActiveView } from '../editor/activeView'

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

export const isVoiceSupported = () => !!recognitionClass()

export const voiceStore = createStore<{
  listening: boolean
  /** Words still being recognised, shown but not yet typed. */
  interim: string
  consentOpen: boolean
}>()(() => ({ listening: false, interim: '', consentOpen: false }))

const CONSENT_KEY = 'blankleaf:voice-consent'
const MAX_QUICK_RESTARTS = 3
const QUICK_MS = 1000

const PROBLEMS: Record<string, string> = {
  'not-allowed': 'Allow microphone access in your browser to use voice typing.',
  'service-not-allowed': 'Allow microphone access in your browser to use voice typing.',
  'audio-capture': 'No microphone was found.',
  network: 'Voice typing needs an internet connection in this browser.',
  'language-not-supported': 'Voice typing doesn’t support your browser’s language.',
}

function hasConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === 'yes'
  } catch {
    return false
  }
}

let stopCurrent: (() => void) | null = null

export const stopVoice = () => stopCurrent?.()

function insert(view: EditorView, words: string) {
  const { from } = view.state.selection.main
  const before = view.state.sliceDoc(Math.max(0, from - 1), from)
  const text = (before && !/\s/.test(before) ? ' ' : '') + words
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
  recognition.continuous = true
  recognition.interimResults = true

  const noteId = getStore().getState().session.activeTabId
  let active = true
  let startedAt = 0
  let quickRestarts = 0

  const stop = () => {
    if (!active) return
    active = false
    stopCurrent = null
    unsubscribe()
    document.removeEventListener('visibilitychange', onVisibility)
    voiceStore.setState({ listening: false, interim: '' })
    recognition.onresult = null
    recognition.abort()
  }
  const unsubscribe = getStore().subscribe((s) => {
    if (s.session.activeTabId !== noteId || (noteId && s.notes[noteId]?.locked)) stop()
  })
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') stop()
  }
  const listen = () => {
    startedAt = Date.now()
    recognition.start()
  }

  recognition.onresult = (e) => {
    if (!active || !view.dom.isConnected) return stop()
    quickRestarts = 0
    let interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const result = e.results[i]
      const words = result[0].transcript.trim()
      if (result.isFinal) {
        if (words) insert(view, words)
      } else interim += result[0].transcript
    }
    voiceStore.setState({ interim: interim.trim() })
  }
  recognition.onerror = ({ error }) => {
    const problem = PROBLEMS[error]
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

  stopCurrent = stop
  document.addEventListener('visibilitychange', onVisibility)
  voiceStore.setState({ listening: true, interim: '' })
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
  if (hasConsent()) start(view)
  else voiceStore.setState({ consentOpen: true })
}

export function acceptVoiceConsent(): void {
  try {
    localStorage.setItem(CONSENT_KEY, 'yes')
  } catch {
    // Private browsing: it simply asks again next time.
  }
  voiceStore.setState({ consentOpen: false })
  const view = getActiveView()
  if (view) start(view)
}
