import { render, screen } from '@testing-library/react'
import { createAppStore, initStore } from '../store/store'
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
})
