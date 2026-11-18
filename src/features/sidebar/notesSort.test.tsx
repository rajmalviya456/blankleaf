import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { mergeSettings } from '../../domain/defaults'
import { liveNotesSorted } from '../../store/selectors'
import { createAppStore, initStore } from '../../store/store'
import { NotesList } from './NotesList'

function setup() {
  const store = initStore(createAppStore())
  const s = () => store.getState()
  const add = (title: string, createdAt: number, updatedAt: number, pinned = false) =>
    s().newNote({ title, content: title, createdAt, updatedAt, pinned })
  add('banana', 1, 30)
  add('Apple', 3, 10)
  add('cherry 10', 2, 20)
  add('cherry 9', 0, 5)
  add('zebra', 4, 1, true)
  return { s }
}
const titles = (s: () => ReturnType<ReturnType<typeof createAppStore>['getState']>) =>
  liveNotesSorted(s()).map((n) => n.title)

describe('sorting the notes list', () => {
  it('defaults to last edited, pinned first', () => {
    const { s } = setup()
    expect(s().settings.notesSort).toBe('edited')
    expect(titles(s)).toEqual(['zebra', 'banana', 'cherry 10', 'Apple', 'cherry 9'])
  })

  it('sorts by name, ignoring case and reading numbers naturally', () => {
    const { s } = setup()
    act(() => s().updateSettings({ notesSort: 'title' }))
    expect(titles(s)).toEqual(['zebra', 'Apple', 'banana', 'cherry 9', 'cherry 10'])
  })

  it('sorts by date created, newest first', () => {
    const { s } = setup()
    act(() => s().updateSettings({ notesSort: 'created' }))
    expect(titles(s)).toEqual(['zebra', 'Apple', 'cherry 10', 'banana', 'cherry 9'])
  })

  it('an unknown saved value falls back to last edited', () => {
    expect(mergeSettings({ notesSort: 'nonsense' as never }).notesSort).toBe('edited')
  })

  it('can be changed from the list, and the choice is shown', async () => {
    const { s } = setup()
    const user = userEvent.setup()
    render(<NotesList />)
    await user.click(screen.getByRole('button', { name: 'Sort notes' }))
    const menu = await screen.findByRole('menu')
    expect(within(menu).getByRole('menuitemradio', { name: 'Last edited' })).toBeChecked()
    await user.click(within(menu).getByRole('menuitemradio', { name: 'Name' }))
    expect(s().settings.notesSort).toBe('title')
    const rows = within(screen.getByRole('list', { name: 'Notes' })).getAllByRole('listitem')
    expect(rows[1]).toHaveTextContent('Apple')
  })
})
