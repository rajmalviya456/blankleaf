import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
    const bar = screen.getByRole('contentinfo', { name: /status bar/i })
    expect(bar).toHaveTextContent('Ln 2, Col 3')
    expect(bar).toHaveTextContent('3 words')
    expect(bar).toHaveTextContent('13 chars')
    expect(bar).toHaveTextContent('Plain text')
    expect(bar).toHaveTextContent('Wrap: on')
  })

  it('counts the selection while text is selected', () => {
    const { id, s } = setup()
    const bar = screen.getByRole('contentinfo', { name: /status bar/i })
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
    // The visible one carries the reason (screen readers also hear it from the announcer).
    expect(screen.getByTitle('Quota exceeded')).toHaveTextContent('Not saved')
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

  it('History button opens version history for the active note', async () => {
    const { id } = setup()
    const { historyStore } = await import('../../features/history/historyStore')
    await userEvent.click(screen.getByRole('button', { name: 'Version history' }))
    expect(historyStore.getState().noteId).toBe(id)
    act(() => historyStore.getState().close())
  })

  it('narrow windows find version history in the More note settings menu', async () => {
    const { id } = setup()
    const { historyStore } = await import('../../features/history/historyStore')
    await userEvent.click(screen.getByRole('button', { name: 'More note settings' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Version history…' }))
    expect(historyStore.getState().noteId).toBe(id)
    act(() => historyStore.getState().close())
  })

  it('has no History button for a locked note', () => {
    const { id, s } = setup()
    act(() =>
      s().applyLock(id, { v: 1, salt: 's', iv: 'i', data: 'd', iterations: 1, origin: id }, 'L'),
    )
    expect(screen.queryByRole('button', { name: 'Version history' })).toBeNull()
  })
})

describe('StatusBar for assistive tech', () => {
  it('groups its items so they read, and look, as a few clear sets', () => {
    const { id, s } = setup()
    act(() => s().setNoteMode(id, 'markdown'))
    const bar = screen.getByRole('contentinfo', { name: 'Status bar' })
    const view = within(bar).getByRole('group', { name: 'Format and view' })
    expect(within(view).getByRole('radiogroup', { name: 'View' })).toBeInTheDocument()
    const counts = within(bar).getByRole('group', { name: 'Position and counts' })
    expect(counts).toHaveTextContent('words')
    const settings = within(bar).getByRole('group', { name: 'Note settings' })
    expect(within(settings).getByRole('button', { name: /^Spelling/ })).toBeInTheDocument()
    expect(within(settings).getByRole('button', { name: /^Live Markdown/ })).toBeInTheDocument()
    const actions = within(bar).getByRole('group', { name: 'Note actions' })
    expect(within(actions).getByRole('button', { name: 'Version history' })).toBeInTheDocument()
    expect(within(actions).getByRole('button', { name: 'Share note' })).toBeInTheDocument()
  })

  it('is a footer with buttons, and announces only save problems (not every save)', () => {
    const { s } = setup()
    const bar = screen.getByRole('contentinfo', { name: 'Status bar' })
    expect(bar).not.toHaveAttribute('role', 'status')
    const status = within(bar).getByRole('status', { name: 'Save status' })
    // Saving happens after every pause in typing: saying so each time would be noise.
    act(() => s().setSaveStatus('saving'))
    expect(status).toHaveTextContent('')
    act(() => s().setSaveStatus('saved'))
    expect(status).toHaveTextContent('')
    act(() => s().setSaveStatus('error', 'Disk full'))
    expect(status).toHaveTextContent('Not saved')
    // Once saving works again, that's worth hearing too.
    act(() => s().setSaveStatus('saved'))
    expect(status).toHaveTextContent('Saved')
    act(() => s().setSaveStatus('saving'))
    expect(status).toHaveTextContent('')
    // The visible state is still there for everyone.
    expect(bar).toHaveTextContent('Saving…')
  })
})

describe('StatusBar with two notes side by side', () => {
  it('describes the note being edited, including the side note', () => {
    const store = initStore(createAppStore())
    const s = () => store.getState()
    const side = s().newNote({ content: 'one two three four five' })
    s().newNote({ content: 'main' })
    s().setSplitNote(side)
    render(<StatusBar />)
    const bar = screen.getByRole('contentinfo', { name: 'Status bar' })
    expect(bar).toHaveTextContent('1 word')
    act(() => s().setUi({ sideFocused: true }))
    expect(bar).toHaveTextContent('5 words')
  })
})

describe('StatusBar on narrower windows', () => {
  it('a … menu reaches the settings that don’t fit', async () => {
    const store = initStore(createAppStore())
    const s = () => store.getState()
    const id = s().newNote({ content: 'one two' })
    render(<StatusBar />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'More note settings' }))
    await user.click(await screen.findByRole('menuitemcheckbox', { name: 'Spell check' }))
    expect(s().settings.spellcheck).toBe(true)
    await user.click(screen.getByRole('button', { name: 'More note settings' }))
    await user.click(await screen.findByRole('menuitemcheckbox', { name: 'Wrap long lines' }))
    expect(s().notes[id].wrap).toBe(false)
    await user.click(screen.getByRole('button', { name: 'More note settings' }))
    expect(await screen.findByRole('menuitem', { name: 'Tags…' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Word goal…' })).toBeInTheDocument()
  })
})

describe('StatusBar: live Markdown switch', () => {
  it('shows for Markdown notes and turns live Markdown on for every note', async () => {
    const store = initStore(createAppStore())
    const s = () => store.getState()
    const id = s().newNote({ content: '# hi' })
    act(() => s().setLanguage(id, 'markdown'))
    render(<StatusBar />)
    const user = userEvent.setup()
    expect(s().settings.liveMarkdown).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Live Markdown: off' }))
    expect(s().settings.liveMarkdown).toBe(true)
    expect(screen.getByRole('button', { name: 'Live Markdown: on' })).toBeInTheDocument()
  })

  it('is hidden for plain notes', () => {
    const store = initStore(createAppStore())
    store.getState().newNote({ content: 'plain' })
    render(<StatusBar />)
    expect(screen.queryByRole('button', { name: /^Live Markdown/ })).toBeNull()
  })
})
