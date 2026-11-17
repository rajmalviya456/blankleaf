import { act, render, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { stubMedia } from '../../../tests/media'
import { App } from '../../app/App'
import { createAppStore, initStore } from '../../store/store'
import { phoneStore } from './phoneStore'
import { useKeyboardInset } from './useKeyboardInset'

type VV = { height: number; offsetTop: number; listeners: Set<() => void> }
let vv: VV | null = null
function mockViewport(height: number, offsetTop = 0) {
  vv = { height, offsetTop, listeners: new Set() }
  const target = vv
  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    value: {
      get height() {
        return target.height
      },
      get offsetTop() {
        return target.offsetTop
      },
      addEventListener: (_: string, cb: () => void) => target.listeners.add(cb),
      removeEventListener: (_: string, cb: () => void) => target.listeners.delete(cb),
    },
  })
}
const resizeViewport = (height: number) =>
  act(() => {
    vv!.height = height
    vv!.listeners.forEach((cb) => cb())
  })

let media: ReturnType<typeof stubMedia>
beforeEach(() => {
  phoneStore.setState({ stack: [], previewByTab: {} })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })
})
afterEach(() => {
  media?.restore()
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: undefined })
})

describe('useKeyboardInset', () => {
  it('reports how much the keyboard covers', () => {
    mockViewport(800)
    const { result } = renderHook(() => useKeyboardInset())
    expect(result.current).toBe(0)
    resizeViewport(500)
    expect(result.current).toBe(300)
  })

  it('is 0 without visualViewport', () => {
    const { result } = renderHook(() => useKeyboardInset())
    expect(result.current).toBe(0)
  })
})

function setup() {
  media = stubMedia({ phone: true })
  const store = initStore(createAppStore())
  render(<App />)
  return { s: () => store.getState() }
}
const toolbar = () => screen.queryByRole('toolbar', { name: 'Editor toolbar' })

describe('phone toolbar dock', () => {
  it('stays above the keyboard: --kb follows the covered height', () => {
    mockViewport(800)
    const { s } = setup()
    act(() => void s().newNote())
    const shell = screen.getByTestId('phone-shell')
    expect(shell.style.getPropertyValue('--kb')).toBe('0px')
    resizeViewport(480)
    expect(shell.style.getPropertyValue('--kb')).toBe('320px')
    expect(toolbar()).toBeInTheDocument()
  })

  it('compact: note actions and text size move to the note menu', () => {
    const { s } = setup()
    act(() => void s().newNote())
    expect(toolbar()).toBeInTheDocument()
    for (const name of [
      'Copy all text',
      'Download note',
      'Share via link',
      'Move to Trash',
      'Larger text',
      'Smaller text',
    ])
      expect(screen.queryByRole('button', { name })).toBeNull()
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument()
  })

  it('hidden in Preview, in zen, and when the toolbar setting is off', () => {
    const { s } = setup()
    let id = ''
    act(() => {
      id = s().newNote()
      s().setNoteMode(id, 'markdown')
    })
    expect(toolbar()).toBeInTheDocument()
    act(() => phoneStore.getState().setPreview(id, true))
    expect(toolbar()).toBeNull()
    act(() => phoneStore.getState().setPreview(id, false))
    act(() => s().toggleZen())
    expect(toolbar()).toBeNull()
    act(() => s().toggleZen())
    act(() => s().updateSettings({ showToolbar: false }))
    expect(toolbar()).toBeNull()
  })

  it('"More tools" appears only when the row overflows, and scrolls it', () => {
    const { s } = setup()
    act(() => void s().newNote())
    const row = toolbar()!
    Object.defineProperty(row, 'clientWidth', { configurable: true, value: 300 })
    Object.defineProperty(row, 'scrollWidth', { configurable: true, value: 300 })
    act(() => void row.dispatchEvent(new Event('scroll')))
    expect(screen.queryByRole('button', { name: 'More tools' })).toBeNull()
    Object.defineProperty(row, 'scrollWidth', { configurable: true, value: 700 })
    act(() => void window.dispatchEvent(new Event('resize')))
    const more = screen.getByRole('button', { name: 'More tools' })
    let scrolledBy = 0
    row.scrollBy = ((o: ScrollToOptions) => (scrolledBy = o.left ?? 0)) as typeof row.scrollBy
    act(() => more.click())
    expect(scrolledBy).toBeGreaterThan(0)
  })
})
