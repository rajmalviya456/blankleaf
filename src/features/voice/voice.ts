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
  if (remembered(CONSENT_KEY)) start(view)
  else voiceStore.setState({ consentOpen: true })
}

export function acceptVoiceConsent(): void {
  remember(CONSENT_KEY)
  voiceStore.setState({ consentOpen: false })
  const view = getActiveView()
  if (view) start(view)
}
