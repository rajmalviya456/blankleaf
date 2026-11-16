import { render, screen } from '@testing-library/react'
import { App } from './App'

describe('App', () => {
  it('renders the app root', () => {
    render(<App />)
    expect(screen.getByTestId('app-root')).toBeInTheDocument()
  })

  it('renders the hybrid layout regions', () => {
    render(<App />)
    expect(screen.getByRole('tablist')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /sidebar/i })).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
  })
})
