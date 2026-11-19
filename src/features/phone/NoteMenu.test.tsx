import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stubMedia } from '../../../tests/media'
import { App } from '../../app/App'
import { createAppStore, initStore } from '../../store/store'
import { shareStore } from '../share/shareStore'
import { phoneStore } from './phoneStore'

let media: ReturnType<typeof stubMedia>
beforeEach(() => phoneStore.setState({ stack: [], previewByTab: {} }))
afterEach(() => media?.restore())

function setup(content = 'one two three\nfour') {
  media = stubMedia({ phone: true })
  const store = initStore(createAppStore())
  const s = () => store.getState()
  const id = s().newNote()
  s().updateContent(id, content)
  render(<App />)
  return { s, id, user: userEvent.setup() }
}
const openMenu = async () => {
  act(() => phoneStore.getState().open('menu'))
  return screen.findByRole('dialog', { name: 'Note menu' })
}

describe('Note menu', () => {
  it('lists every note action, in order', async () => {
    setup()
    const menu = await openMenu()
    const names = within(menu)
      .getAllByRole('button')
      .map((b) => b.getAttribute('aria-label') ?? b.textContent?.trim())
    const order = [
      'Format: Plain text (auto)',
      'Smaller text',
      'Larger text',
      'Find & replace',
      'Share…',
      'Copy all text',
      'Download',
      'Duplicate',
      'Pin',
      'Rename',
      'Zen mode',
      'Commands…',
      'Move to Trash',
    ]
    const at = order.map((n) => names.indexOf(n))
    expect(at.every((i) => i >= 0)).toBe(true)
    expect([...at].sort((a, b) => a - b)).toEqual(at)
    expect(within(menu).getByRole('switch', { name: 'Wrap lines' })).toBeInTheDocument()
  })

  it('runs actions: share opens the share dialog, copy writes the clipboard, trash moves the note', async () => {
    const { s, id, user } = setup('copy me')
    const write = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: write },
    })
    let menu = await openMenu()
    await user.click(within(menu).getByRole('button', { name: 'Copy all text' }))
    expect(write).toHaveBeenCalledWith('copy me')
    menu = await openMenu()
    await user.click(within(menu).getByRole('button', { name: 'Share…' }))
    expect(shareStore.getState().dialogNoteId).toBe(id)
    act(() => shareStore.getState().close())
    menu = await openMenu()
    await user.click(within(menu).getByRole('button', { name: 'Move to Trash' }))
    expect(s().notes[id].deletedAt).not.toBeNull()
  })

  it('text size − / + changes the phone size (16–72) and leaves the laptop size alone', async () => {
    const { s, user } = setup()
    const menu = await openMenu()
    await user.click(within(menu).getByRole('button', { name: 'Larger text' }))
    expect(s().settings.phoneEditorFontSize).toBe(17)
    await user.click(within(menu).getByRole('button', { name: 'Smaller text' }))
    await user.click(within(menu).getByRole('button', { name: 'Smaller text' }))
    expect(s().settings.phoneEditorFontSize).toBe(16)
    expect(within(menu).getByRole('button', { name: 'Smaller text' })).toBeDisabled()
    expect(s().settings.editorFontSize).toBe(14)
  })

  it('footer shows line, column, words and characters', async () => {
    const { s, id } = setup('one two three\nfour')
    act(() => s().setViewState(id, { anchor: 16, head: 16 }))
    const menu = await openMenu()
    expect(menu).toHaveTextContent('Ln 2, Col 3 · 4 words · 18 chars')
  })

  it('footer counts the selection too', async () => {
    const { s, id } = setup('one two three\nfour')
    act(() => s().setViewState(id, { anchor: 0, head: 7 }))
    const menu = await openMenu()
    expect(menu).toHaveTextContent('2 words, 7 chars selected')
  })

  it('format sheet filters by typing and sets the language', async () => {
    const { s, id, user } = setup()
    const menu = await openMenu()
    await user.click(within(menu).getByRole('button', { name: 'Format: Plain text (auto)' }))
    const sheet = await screen.findByRole('dialog', { name: 'Format' })
    await user.type(within(sheet).getByRole('searchbox', { name: 'Find a format' }), 'pyth')
    expect(within(sheet).queryByRole('button', { name: /JSON/ })).toBeNull()
    await user.click(within(sheet).getByRole('button', { name: /Python/ }))
    expect(s().notes[id].language).toBe('python')
  })

  it('zen on a phone shows a persistent "Exit zen" button', async () => {
    const { s, user } = setup()
    const menu = await openMenu()
    await user.click(within(menu).getByRole('button', { name: 'Zen mode' }))
    expect(s().session.zen).toBe(true)
    await user.click(await screen.findByRole('button', { name: 'Exit zen' }))
    expect(s().session.zen).toBe(false)
  })
})

describe('Note menu: Linked from', () => {
  it('lists the notes that link to this one, and opens one', async () => {
    media = stubMedia({ phone: true })
    const store = initStore(createAppStore())
    const s = () => store.getState()
    const journal = s().newNote({ title: 'Journal', content: 'see [[Plan]]' })
    s().newNote({ title: 'Plan', content: 'the plan' })
    render(<App />)
    const user = userEvent.setup()
    const menu = await openMenu()
    expect(within(menu).getByText('Linked from')).toBeInTheDocument()
    await user.click(within(menu).getByRole('button', { name: 'Journal' }))
    expect(s().session.activeTabId).toBe(journal)
  })
})
