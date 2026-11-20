import { EditorView } from '@codemirror/view'
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

describe('browsers that include speech recognition but can’t use it', () => {
  const brands = (...names: string[]) =>
    vi.stubGlobal('navigator', {
      ...navigator,
      language: 'en-US',
      onLine: true,
      userAgentData: { brands: names.map((brand) => ({ brand, version: '1' })) },
    })

  it.each([
    ['Brave', ['Brave', 'Chromium']],
    ['Vivaldi', ['Vivaldi', 'Chromium']],
    ['Opera', ['Opera', 'Chromium']],
    ['a plain Chromium build', ['Chromium', 'Not=A?Brand']],
  ])('%s shows no voice typing', (_, names) => {
    brands(...names)
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

  it.each([
    ['Chrome', ['Google Chrome', 'Chromium']],
    ['Edge', ['Microsoft Edge', 'Chromium']],
  ])('%s keeps it', (_, names) => {
    brands(...names)
    expect(isVoiceSupported()).toBe(true)
  })

  it('an unknown browser that fails is never offered it again', async () => {
    const { user } = setup()
    render(<App />)
    await startListening(user)
    rec().fail('network')
    expect(toastStore.getState().toasts.at(-1)?.msg).toMatch(/isn’t available in this browser/)
    await waitFor(() => expect(mic()).toBeNull())
    expect(isVoiceSupported()).toBe(false)
  })

  it('Chrome keeps the button after a connection problem, and says what to check', async () => {
    brands('Google Chrome', 'Chromium')
    const { user } = setup()
    render(<App />)
    await startListening(user)
    rec().fail('network')
    expect(toastStore.getState().toasts.at(-1)?.msg).toMatch(/connection or VPN/)
    expect(mic()).not.toBeNull()
  })

  it('being offline is reported as being offline', async () => {
    const { user } = setup()
    render(<App />)
    await startListening(user)
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    rec().fail('network')
    expect(toastStore.getState().toasts.at(-1)?.msg).toMatch(/You’re offline/)
    expect(mic()).not.toBeNull()
    vi.restoreAllMocks()
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

  it('dictating into the side note keeps going until that note is closed', async () => {
    media = stubMedia({ wide: true })
    const { s, id, user } = setup()
    const side = s().newNote({ content: 'Side' })
    const third = s().newNote({ content: 'Third' })
    act(() => s().setActive(id))
    act(() => s().setSplitNote(side))
    render(<App />)
    const pane = screen.getByRole('region', { name: /^Side note/ })
    const view = EditorView.findFromDOM(pane.querySelector('.cm-editor') as HTMLElement)!
    act(() => view.focus())
    await startListening(user)
    rec().say('hello')
    expect(s().notes[side].content).toMatch(/hello/i)
    act(() => s().setActive(third))
    expect(voiceStore.getState().listening).toBe(true)
    act(() => s().setSplitNote(null))
    expect(voiceStore.getState().listening).toBe(false)
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

describe('what gets typed', () => {
  const send = (resultIndex: number, results: [string, boolean][]) =>
    act(() =>
      rec().onresult?.({
        resultIndex,
        results: results.map(([t, isFinal]) => Object.assign([{ transcript: t }], { isFinal })),
      }),
    )
  async function dictate(content: string, at = content.length) {
    const ctx = setup(content)
    render(<App />)
    act(() => getActiveView()!.dispatch({ selection: { anchor: at } }))
    await startListening(ctx.user)
    return ctx
  }

  it('Stop keeps the words still being heard', async () => {
    const { s, id, user } = await dictate('Hello')
    rec().say('my friend', false)
    const bubble = screen.getByRole('status', { name: 'Voice typing' })
    await user.click(within(bubble).getByRole('button', { name: 'Stop voice typing' }))
    expect(s().notes[id].content).toBe('Hello my friend')
  })

  it('never types the same result twice when the browser sends it again', async () => {
    const { s, id } = await dictate('Hello')
    send(0, [['one', true]])
    send(0, [
      ['one', true],
      ['two', false],
    ])
    send(1, [
      ['one', true],
      ['two', true],
    ])
    expect(s().notes[id].content).toBe('Hello one two')
  })

  it('puts no space before punctuation, and keeps the next word apart', async () => {
    const { s, id } = await dictate('Hello', 5)
    rec().say(', and')
    expect(s().notes[id].content).toBe('Hello, and')
    act(() => getActiveView()!.dispatch({ selection: { anchor: 0 } }))
    rec().say('Well')
    expect(s().notes[id].content).toBe('Well Hello, and')
  })

  it('starts a sentence with a capital after a full stop or on a new line', async () => {
    const { s, id } = await dictate('Done.')
    rec().say('next thing')
    expect(s().notes[id].content).toBe('Done. Next thing')
    act(() => getActiveView()!.dispatch(getActiveView()!.state.replaceSelection('\n')))
    rec().say('more')
    expect(s().notes[id].content).toBe('Done. Next thing\nMore')
    rec().say('and iPhone')
    expect(s().notes[id].content).toBe('Done. Next thing\nMore and iPhone')
  })

  it('on Android, listens one phrase at a time (its continuous mode repeats words)', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (Linux; Android 14; Pixel Tablet) AppleWebKit/537.36 Chrome/140 Safari/537.36',
    )
    await dictate('Hello')
    expect(rec().continuous).toBe(false)
    vi.restoreAllMocks()
  })

  it('keeps going into the same note when its editor is redrawn (Edit → Split)', async () => {
    const { s, id } = await dictate('# Hello')
    act(() => s().setNoteMode(id, 'markdown'))
    act(() => s().setViewState(id, { previewMode: 'split' }))
    rec().say('world')
    expect(voiceStore.getState().listening).toBe(true)
    expect(s().notes[id].content).toBe('# Hello world')
  })
})

describe('the voice typing bubble', () => {
  it('shows in the pane of the note being dictated into', async () => {
    media = stubMedia({ wide: true })
    const { s, id, user } = setup()
    const side = s().newNote({ content: 'Side' })
    act(() => s().setActive(id))
    act(() => s().setSplitNote(side))
    render(<App />)
    const pane = screen.getByRole('region', { name: /^Side note/ })
    const view = EditorView.findFromDOM(pane.querySelector('.cm-editor') as HTMLElement)!
    act(() => view.focus())
    await startListening(user)
    expect(within(pane).getByRole('status', { name: 'Voice typing' })).toBeInTheDocument()
    expect(screen.getAllByRole('status', { name: 'Voice typing' })).toHaveLength(1)
  })
})
