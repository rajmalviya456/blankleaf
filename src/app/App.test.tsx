import { act, fireEvent, render, screen } from '@testing-library/react'
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

  it('renders the hybrid layout regions', () => {
    render(<App />)
    expect(screen.getByRole('tablist')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /sidebar/i })).toBeInTheDocument()
    expect(screen.getByRole('contentinfo', { name: /status bar/i })).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('keeps what you type while the command palette is still loading', async () => {
    render(<App />)
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
})
