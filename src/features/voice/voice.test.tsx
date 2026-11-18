import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stubMedia } from '../../../tests/media'
import { App } from '../../app/App'
import { COMMANDS, commandEnabled } from '../../commands/registry'
import { createAppStore, initStore } from '../../store/store'
import { toastStore } from '../../ui/toast'
import { getActiveView } from '../editor/activeView'
import { isVoiceSupported, stopVoice, voiceStore } from './voice'

class FakeRecognition {
  static last: FakeRecognition | null = null
  lang = ''
  continuous = false
  interimResults = false
  started = 0
  stopped = 0
  onresult: ((e: unknown) => void) | null = null
  onerror: ((e: unknown) => void) | null = null
  onend: (() => void) | null = null
  constructor() {
    FakeRecognition.last = this
  }
  start() {
    this.started++
  }
  stop() {
    this.stopped++
    this.onend?.()
  }
  abort() {
    this.stop()
  }
  say(text: string, isFinal = true) {
    const result = Object.assign([{ transcript: text }], { isFinal })
    act(() => this.onresult?.({ resultIndex: 0, results: [result] }))
  }
  fail(error: string) {
    act(() => {
      this.onerror?.({ error })
      this.onend?.()
    })
  }
}

const rec = () => FakeRecognition.last!
const mic = () => screen.queryByRole('button', { name: /voice typing/i })
let media: ReturnType<typeof stubMedia> | undefined

function setup(content = 'Hello') {
  const store = initStore(createAppStore())
  const s = () => store.getState()
  const id = s().newNote({ content })
  return { store, s, id, user: userEvent.setup() }
}
async function startListening(user: ReturnType<typeof userEvent.setup>) {
  await user.click(mic()!)
  const dialog = await screen.findByRole('dialog', { name: 'Turn on voice typing?' })
  await user.click(within(dialog).getByRole('button', { name: 'Turn on' }))
  await waitFor(() => expect(voiceStore.getState().listening).toBe(true))
}

beforeEach(() => {
  localStorage.clear()
  FakeRecognition.last = null
  vi.stubGlobal('webkitSpeechRecognition', FakeRecognition)
})
afterEach(() => {
  act(() => stopVoice())
  act(() => voiceStore.setState({ consentOpen: false }))
  act(() => toastStore.setState({ toasts: [] }))
  media?.restore()
  media = undefined
  vi.unstubAllGlobals()
})

describe('browsers without speech recognition', () => {
  beforeEach(() => {
    vi.stubGlobal('webkitSpeechRecognition', undefined)
    vi.stubGlobal('SpeechRecognition', undefined)
  })

  it('show no voice typing anywhere', () => {
    const { s } = setup()
    render(<App />)
    expect(isVoiceSupported()).toBe(false)
    expect(mic()).toBeNull()
    expect(
      commandEnabled(
        COMMANDS.find((c) => c.id === 'voice.toggle')!,
        s(),
      ),
    ).toBe(false)
  })
})

describe('phones', () => {
  it('use the keyboard’s own microphone, so there’s no extra button', () => {
    media = stubMedia({ phone: true, touch: true })
    const { s } = setup()
    render(<App />)
    expect(mic()).toBeNull()
    expect(
      commandEnabled(
        COMMANDS.find((c) => c.id === 'voice.toggle')!,
        s(),
      ),
    ).toBe(false)
  })
})

describe('voice typing', () => {
  it('warns where speech goes before the microphone is ever used', async () => {
    const { user } = setup()
    render(<App />)
    await user.click(mic()!)
    const dialog = await screen.findByRole('dialog', { name: 'Turn on voice typing?' })
    expect(dialog).toHaveTextContent(/sent to .*speech service/i)
    expect(FakeRecognition.last).toBeNull()
    await user.click(within(dialog).getByRole('button', { name: 'Not now' }))
    expect(FakeRecognition.last).toBeNull()
    expect(voiceStore.getState().listening).toBe(false)
  })

  it('asks only once', async () => {
    const { user } = setup()
    render(<App />)
    await startListening(user)
    await user.click(screen.getAllByRole('button', { name: 'Stop voice typing' })[0])
    await user.click(mic()!)
    expect(screen.queryByRole('dialog', { name: 'Turn on voice typing?' })).toBeNull()
    expect(voiceStore.getState().listening).toBe(true)
  })

  it('types finished words into the note, with spacing, and previews the rest', async () => {
    const { s, id, user } = setup()
    render(<App />)
    act(() => getActiveView()!.dispatch({ selection: { anchor: 5 } }))
    await startListening(user)
    rec().say('wor', false)
    expect(screen.getByRole('status', { name: 'Voice typing' })).toHaveTextContent('wor')
    expect(s().notes[id].content).toBe('Hello')
    rec().say('world')
    expect(s().notes[id].content).toBe('Hello world')
    rec().say('again')
    expect(s().notes[id].content).toBe('Hello world again')
  })

  it('keeps listening through the browser’s pauses, until stopped', async () => {
    const { user } = setup()
    render(<App />)
    await startListening(user)
    act(() => rec().onend?.())
    expect(rec().started).toBe(2)
    await user.click(screen.getAllByRole('button', { name: 'Stop voice typing' })[0])
    expect(voiceStore.getState().listening).toBe(false)
    act(() => rec().onend?.())
    expect(rec().started).toBe(2)
  })

  it.each([
    ['not-allowed', /Allow microphone/],
    ['audio-capture', /No microphone/],
    ['network', /internet connection/],
  ])('explains the %s error and stops', async (error, message) => {
    const { user } = setup()
    render(<App />)
    await startListening(user)
    rec().fail(error)
    expect(voiceStore.getState().listening).toBe(false)
    expect(toastStore.getState().toasts.at(-1)?.msg).toMatch(message)
  })

  it('stops when you switch notes, so words never land in the wrong one', async () => {
    const { s, id, user } = setup()
    const other = s().newNote({ content: 'Other' })
    act(() => s().setActive(id))
    render(<App />)
    await startListening(user)
    act(() => s().setActive(other))
    expect(voiceStore.getState().listening).toBe(false)
    rec().say('stray')
    expect(s().notes[other].content).toBe('Other')
    expect(s().notes[id].content).toBe('Hello')
  })

  it('stops when the page is hidden', async () => {
    const { user } = setup()
    render(<App />)
    await startListening(user)
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    act(() => void document.dispatchEvent(new Event('visibilitychange')))
    expect(voiceStore.getState().listening).toBe(false)
    vi.restoreAllMocks()
  })

  it('is available from the palette', () => {
    const { s } = setup()
    expect(
      commandEnabled(
        COMMANDS.find((c) => c.id === 'voice.toggle')!,
        s(),
      ),
    ).toBe(true)
  })
})
