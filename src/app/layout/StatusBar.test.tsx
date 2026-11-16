import { act, render, screen } from '@testing-library/react'
import { createAppStore, initStore } from '../../store/store'
import { StatusBar } from './StatusBar'

function setup() {
  const store = initStore(createAppStore())
  const id = store.getState().newNote()
  store.getState().updateContent(id, 'one two\nthree')
  render(<StatusBar />)
  return { id, s: () => store.getState() }
}

describe('StatusBar', () => {
  it('shows position, counts, mode and wrap for the active note', () => {
    const { id, s } = setup()
    act(() => s().setViewState(id, { head: 10 }))
    const bar = screen.getByRole('status', { name: /status bar/i })
    expect(bar).toHaveTextContent('Ln 2, Col 3')
    expect(bar).toHaveTextContent('3 words')
    expect(bar).toHaveTextContent('13 chars')
    expect(bar).toHaveTextContent('Plain text')
    expect(bar).toHaveTextContent('Wrap: on')
  })

  it('shows the save state', () => {
    const { s } = setup()
    expect(screen.getByText('Saved')).toBeInTheDocument()
    act(() => s().setSaveStatus('saving'))
    expect(screen.getByText('Saving…')).toBeInTheDocument()
    act(() => s().setSaveStatus('error', 'Quota exceeded'))
    expect(screen.getByText('Not saved')).toHaveAttribute('title', 'Quota exceeded')
  })

  it('is empty of note info when no tab is open', () => {
    initStore(createAppStore())
    render(<StatusBar />)
    expect(screen.queryByText(/Ln /)).toBeNull()
  })
})
