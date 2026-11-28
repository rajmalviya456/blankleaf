import { StrictMode } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { createAppStore, getStore, initStore } from '../store/store'
import { App } from './App'

beforeEach(() => {
  initStore(createAppStore()).getState().newNote()
})

describe('App', () => {
  it('renders the app root', () => {
    render(<App />)
    expect(screen.getByTestId('app-root')).toBeInTheDocument()
  })

  it('still renders when the browser blocks site storage', () => {
    // "Block site data": just reading window.localStorage throws.
    const blocked = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError')
    })
    try {
      render(<App />)
      expect(screen.getByTestId('app-root')).toBeInTheDocument()
      expect(screen.getByRole('main')).toBeInTheDocument()
    } finally {
      blocked.mockRestore()
    }
  })

  it('renders the hybrid layout regions', () => {
    render(<App />)
    expect(screen.getByRole('tablist')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /sidebar/i })).toBeInTheDocument()
    expect(screen.getByRole('contentinfo', { name: /status bar/i })).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('keeps what you type while the command palette is still loading', async () => {
    // Strict mode, as in main.tsx: React runs renders twice there, which once lost the text.
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
    const s = getStore().getState()
    const id = s.session.activeTabId!
    const before = s.notes[id].content
    act(() => getStore().getState().setUi({ paletteOpen: true }))
    // The palette's code arrives a moment later; typing straight away must not reach the note.
    const early = screen.getByRole('combobox', { name: 'Command palette' })
    expect(early).toHaveFocus()
    fireEvent.change(early, { target: { value: 'wrap' } })
    const dialog = await screen.findByRole('dialog', { name: 'Command palette' })
    expect(dialog.querySelector('[cmdk-input]')).toHaveValue('wrap')
    expect(getStore().getState().notes[id].content).toBe(before)
  })

  it('runs the command when Enter is pressed before the palette has loaded', async () => {
    vi.resetModules()
    const { App: FreshApp } = await import('./App')
    const store = await import('../store/store')
    store.initStore(store.createAppStore()).getState().newNote()
    render(
      <StrictMode>
        <FreshApp />
      </StrictMode>,
    )
    act(() => store.getStore().getState().setUi({ paletteOpen: true }))
    const early = screen.getByRole('combobox', { name: 'Command palette' })
    fireEvent.change(early, { target: { value: 'zen mode' } })
    fireEvent.keyDown(early, { key: 'Enter' })
    await waitFor(() => expect(store.getStore().getState().session.zen).toBe(true))
    expect(store.getStore().getState().ui.paletteOpen).toBe(false)
  })
})
