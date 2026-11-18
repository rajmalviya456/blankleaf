import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { stubMedia } from '../../../tests/media'
import { COMMANDS, commandEnabled } from '../../commands/registry'
import { getActiveView } from '../../features/editor/activeView'
import { createAppStore, initStore } from '../../store/store'
import { App } from '../App'

let media: ReturnType<typeof stubMedia> | undefined
afterEach(() => media?.restore())

function setup(flags = { wide: true }) {
  media = stubMedia(flags)
  const store = initStore(createAppStore())
  const s = () => store.getState()
  const a = s().newNote({ title: 'Alpha', content: 'alpha text' })
  const b = s().newNote({ title: 'Beta', content: 'beta text' })
  return { store, s, a, b }
}
const pane = () => screen.queryByRole('region', { name: /^Side note/ })

describe('two notes side by side', () => {
  it('shows the second note next to the active one, and both can be edited', async () => {
    const { s, a, b } = setup()
    act(() => s().setSplitNote(a))
    render(<App />)
    expect(s().session.activeTabId).toBe(b)
    const side = pane()!
    expect(side).toHaveAccessibleName('Side note: Alpha')
    expect(within(side).getByText('alpha text')).toBeInTheDocument()
    // The toolbar keeps working on the main note.
    expect(getActiveView()?.state.doc.toString()).toBe('beta text')
  })

  it('swaps places when the side note’s tab is chosen', () => {
    const { s, a, b } = setup()
    act(() => s().setSplitNote(a))
    act(() => s().setActive(a))
    expect(s().session.activeTabId).toBe(a)
    expect(s().session.splitNoteId).toBe(b)
  })

  it('closes with its button', async () => {
    const { s, a } = setup()
    act(() => s().setSplitNote(a))
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Close side note' }))
    expect(s().session.splitNoteId).toBeNull()
    expect(pane()).toBeNull()
  })

  it('goes away when its note is trashed', () => {
    const { s, a } = setup()
    act(() => s().setSplitNote(a))
    render(<App />)
    act(() => s().trashNote(a))
    expect(pane()).toBeNull()
  })

  it('needs a wide screen: narrow windows and phones show one note', () => {
    const { s, a } = setup({ wide: false })
    act(() => s().setSplitNote(a))
    render(<App />)
    expect(pane()).toBeNull()
  })

  it('opens from the palette with the previous tab', () => {
    const { store, s, a } = setup()
    const open = COMMANDS.find((c) => c.id === 'view.split.open')!
    expect(open.title).toBe('Open another note side by side')
    expect(commandEnabled(open, s())).toBe(true)
    act(() => open.run({ store }))
    expect(s().session.splitNoteId).toBe(a)
    const close = COMMANDS.find((c) => c.id === 'view.split.close')!
    expect(commandEnabled(close, s())).toBe(true)
    act(() => close.run({ store }))
    expect(s().session.splitNoteId).toBeNull()
  })
})
