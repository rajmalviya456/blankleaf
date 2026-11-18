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

  it('counts the selection while text is selected', () => {
    const { id, s } = setup()
    const bar = screen.getByRole('status', { name: /status bar/i })
    expect(bar).not.toHaveTextContent('selected')
    act(() => s().setViewState(id, { anchor: 0, head: 7 }))
    expect(bar).toHaveTextContent('2 words, 7 chars selected')
    act(() => s().setViewState(id, { anchor: 7, head: 7 }))
    expect(bar).not.toHaveTextContent('selected')
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

  it('wrap label toggles wrap for the note', async () => {
    const { id, s } = setup()
    const { default: userEvent } = await import('@testing-library/user-event')
    await userEvent.click(screen.getByRole('button', { name: /wrap: on/i }))
    expect(s().notes[id].wrap).toBe(false)
  })

  it('says when highlighting is off for a large file', () => {
    const { id, s } = setup()
    act(() => s().updateContent(id, 'x'.repeat(2_000_001)))
    expect(screen.getByText(/large file/i)).toBeInTheDocument()
  })

  it('share button opens the share dialog for the active note', async () => {
    const { id } = setup()
    const { shareStore } = await import('../../features/share/shareStore')
    const { default: userEvent } = await import('@testing-library/user-event')
    await userEvent.click(screen.getByRole('button', { name: /share note/i }))
    expect(shareStore.getState().dialogNoteId).toBe(id)
    act(() => shareStore.getState().close())
  })
})
