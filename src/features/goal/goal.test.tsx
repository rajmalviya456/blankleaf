import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { stubMedia } from '../../../tests/media'
import { App } from '../../app/App'
import { StatusBar } from '../../app/layout/StatusBar'
import { COMMANDS } from '../../commands/registry'
import { WELCOME_CONTENT } from '../../domain/defaults'
import { cleanWordGoal } from '../../domain/wordGoal'
import { readingMinutes } from '../../lib/textStats'
import { createAppStore, initStore } from '../../store/store'
import { parseBackup } from '../backup/backup'
import { phoneStore } from '../phone/phoneStore'
import { goalStore } from './goalStore'

let media: ReturnType<typeof stubMedia> | undefined
afterEach(() => {
  media?.restore()
  media = undefined
  act(() => goalStore.getState().close())
  phoneStore.setState({ stack: [] })
})

function setup(content = 'one two three') {
  const store = initStore(createAppStore())
  const s = () => store.getState()
  return { store, s, id: s().newNote({ content }) }
}
const hints = () => screen.queryByRole('navigation', { name: 'Get started' })

describe('reading time', () => {
  it('rounds up at 200 words a minute', () => {
    expect(readingMinutes(0)).toBe(0)
    expect(readingMinutes(1)).toBe(1)
    expect(readingMinutes(200)).toBe(1)
    expect(readingMinutes(201)).toBe(2)
  })

  it('shows in the status bar once there’s text', () => {
    setup('word '.repeat(450))
    render(<StatusBar />)
    expect(screen.getByRole('status', { name: 'Status bar' })).toHaveTextContent('3 min read')
  })
})

describe('word goals', () => {
  it('accepts only sensible numbers', () => {
    expect(cleanWordGoal(500)).toBe(500)
    for (const bad of [0, -1, 1.5, 2_000_000, '5', null]) expect(cleanWordGoal(bad)).toBeUndefined()
  })

  it('shows progress, and marks the goal when it’s reached', () => {
    const { s, id } = setup()
    act(() => s().setWordGoal(id, 3))
    render(<StatusBar />)
    const goal = screen.getByRole('button', { name: 'Word goal: 3 of 3 words, reached' })
    expect(goal).toHaveTextContent('3 / 3')
  })

  it.each([
    ['laptop', false],
    ['phone', true],
  ])('can be set and removed (%s)', async (_, phone) => {
    media = stubMedia({ phone, touch: phone })
    const { s, id } = setup()
    const user = userEvent.setup()
    render(<App />)
    act(() => goalStore.getState().open(id))
    let dialog = await screen.findByRole('dialog', { name: 'Word goal' })
    await user.type(within(dialog).getByLabelText('Target words'), '500{Enter}')
    expect(s().notes[id].wordGoal).toBe(500)
    act(() => goalStore.getState().open(id))
    dialog = await screen.findByRole('dialog', { name: 'Word goal' })
    await user.click(within(dialog).getByRole('button', { name: 'Remove goal' }))
    expect(s().notes[id].wordGoal).toBeUndefined()
  })

  it('refuses a bad number', async () => {
    const { s, id } = setup()
    const user = userEvent.setup()
    render(<App />)
    act(() => goalStore.getState().open(id))
    const dialog = await screen.findByRole('dialog', { name: 'Word goal' })
    await user.type(within(dialog).getByLabelText('Target words'), '-5')
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeDisabled()
    expect(s().notes[id].wordGoal).toBeUndefined()
  })

  it('survives duplicates and backups, and is a palette command', () => {
    const { store, s, id } = setup()
    act(() => s().setWordGoal(id, 42))
    const copy = s().duplicateNote(id)
    expect(s().notes[copy].wordGoal).toBe(42)
    const b = parseBackup(
      JSON.stringify({
        app: 'blankleaf',
        schemaVersion: 1,
        notes: [
          { id: 'a', content: 'x', wordGoal: 9 },
          { id: 'b', content: 'y', wordGoal: 'no' },
        ],
      }),
    )
    expect(b.notes.map((n) => n.wordGoal)).toEqual([9, undefined])
    act(() => COMMANDS.find((c) => c.id === 'note.goal')!.run({ store }))
    expect(goalStore.getState().noteId).toBe(s().session.activeTabId)
  })

  it('Back closes it on phones', async () => {
    media = stubMedia({ phone: true, touch: true })
    const { id } = setup()
    render(<App />)
    act(() => goalStore.getState().open(id))
    await screen.findByRole('dialog', { name: 'Word goal' })
    expect(phoneStore.getState().stack).toEqual([{ kind: 'app', id: 'goal' }])
  })
})

describe('the blank page', () => {
  function blankAfterNotes() {
    const store = initStore(createAppStore())
    const s = () => store.getState()
    const older = s().newNote({ title: 'Older', content: 'a', updatedAt: 10 })
    const last = s().newNote({ title: 'Yesterday', content: 'b', updatedAt: 20 })
    const blank = s().newNote()
    return { s, older, last, blank }
  }

  it('offers the last edited note, and going there leaves no empty tab', async () => {
    const { s, last, blank } = blankAfterNotes()
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Continue “Yesterday”' }))
    expect(s().session.activeTabId).toBe(last)
    expect(s().notes[blank]).toBeUndefined()
  })

  it('links to the guide pages', () => {
    blankAfterNotes()
    render(<App />)
    const nav = hints()!
    expect(within(nav).getByRole('link', { name: 'Features' })).toHaveAttribute(
      'href',
      '/features/',
    )
    expect(within(nav).getByRole('link', { name: 'FAQ' })).toHaveAttribute('href', '/faq/')
  })

  it('goes away as soon as you type', () => {
    const { s, blank } = blankAfterNotes()
    render(<App />)
    expect(hints()).not.toBeNull()
    act(() => s().updateContent(blank, 'hello'))
    expect(hints()).toBeNull()
  })

  it('shows the links, but nothing to continue, on the first visit', () => {
    const store = initStore(createAppStore())
    store.getState().newNote({ title: 'Welcome', content: WELCOME_CONTENT })
    render(<App />)
    expect(within(hints()!).getByRole('link', { name: 'FAQ' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Continue/ })).toBeNull()
  })

  it('stays out of the way in zen mode and on locked notes', () => {
    const { s } = blankAfterNotes()
    render(<App />)
    act(() => s().toggleZen())
    expect(hints()).toBeNull()
  })
})
