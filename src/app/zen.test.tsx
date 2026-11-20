import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Note } from '../domain/types'
import { createAppStore, initStore } from '../store/store'
import { App } from './App'

function setup(patch: Partial<Note> = {}) {
  const store = initStore(createAppStore())
  const id = store.getState().newNote({ content: 'A quiet page', ...patch })
  render(<App />)
  return { id, s: () => store.getState(), user: userEvent.setup() }
}

const fullscreen = { element: null as Element | null }
function stubFullscreen() {
  Object.defineProperty(document, 'fullscreenEnabled', { value: true, configurable: true })
  Object.defineProperty(document, 'fullscreenElement', {
    get: () => fullscreen.element,
    configurable: true,
  })
  const request = vi.fn(async function (this: Element) {
    fullscreen.element = this
    document.dispatchEvent(new Event('fullscreenchange'))
  })
  const exit = vi.fn(async () => {
    fullscreen.element = null
    document.dispatchEvent(new Event('fullscreenchange'))
  })
  Element.prototype.requestFullscreen = request as never
  document.exitFullscreen = exit
  return { request, exit }
}

afterEach(() => {
  fullscreen.element = null
})

describe('zen mode on a laptop', () => {
  it('has a button in the toolbar', async () => {
    const { s, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Zen mode' }))
    expect(s().session.zen).toBe(true)
  })

  it('also turns on with Alt+Z, which browsers leave alone', () => {
    const { s } = setup()
    act(() => void fireEvent.keyDown(window, { code: 'KeyZ', key: 'z', altKey: true }))
    expect(s().session.zen).toBe(true)
  })

  it('shows only the text: no tabs, toolbar, status bar, line numbers or line highlight', () => {
    const { s } = setup()
    act(() => s().toggleZen())
    expect(screen.queryByRole('tablist')).toBeNull()
    expect(screen.queryByRole('toolbar')).toBeNull()
    expect(screen.queryByRole('contentinfo', { name: 'Status bar' })).toBeNull()
    expect(document.querySelector('.cm-lineNumbers')).toBeNull()
    expect(document.querySelector('.cm-activeLine')).toBeNull()
    expect(document.querySelector('main')).toHaveClass('np-zen')
  })

  it('shows a side-by-side Markdown note as just its text', () => {
    const { s, id } = setup({ content: '# Hi', mode: 'markdown', language: 'markdown' })
    act(() => s().setViewState(id, { previewMode: 'split' }))
    act(() => s().toggleZen())
    expect(screen.queryByRole('article', { name: 'Markdown preview' })).toBeNull()
    expect(document.querySelector('.cm-editor')).not.toBeNull()
  })

  it('goes full screen, and leaving full screen leaves zen', async () => {
    const { request } = stubFullscreen()
    const { s } = setup()
    act(() => s().toggleZen())
    await vi.waitFor(() => expect(request).toHaveBeenCalled())
    await act(async () => {
      await document.exitFullscreen()
    })
    expect(s().session.zen).toBe(false)
  })

  it('leaves full screen when zen is turned off', async () => {
    const { exit } = stubFullscreen()
    const { s } = setup()
    act(() => s().toggleZen())
    await vi.waitFor(() => expect(fullscreen.element).not.toBeNull())
    act(() => s().toggleZen())
    await vi.waitFor(() => expect(exit).toHaveBeenCalled())
  })

  it('turning zen off before full screen has started still ends up out of full screen', async () => {
    const { request } = stubFullscreen()
    let finish!: () => void
    request.mockImplementation(function (this: Element) {
      return new Promise<void>((done) => {
        finish = () => {
          fullscreen.element = this
          document.dispatchEvent(new Event('fullscreenchange'))
          done()
        }
      })
    })
    const { s } = setup()
    act(() => s().toggleZen())
    act(() => s().toggleZen())
    await act(async () => finish())
    await vi.waitFor(() => expect(fullscreen.element).toBeNull())
    expect(s().session.zen).toBe(false)
  })
})
