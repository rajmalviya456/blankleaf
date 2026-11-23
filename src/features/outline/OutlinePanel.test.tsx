import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { stubMedia } from '../../../tests/media'
import { App } from '../../app/App'
import { COMMANDS } from '../../commands/registry'
import { createAppStore, initStore } from '../../store/store'
import { viewForNote } from '../editor/activeView'

let media: ReturnType<typeof stubMedia> | undefined
afterEach(() => media?.restore())

const DOC = '# Plan\n\nintro\n\n## Week one\n\nwork\n\n## Week two\n\nrest'

function setup(markdown = true) {
  media = stubMedia({ wide: true })
  const store = initStore(createAppStore())
  const s = () => store.getState()
  const id = s().newNote({ content: DOC })
  s().setLanguage(id, markdown ? 'markdown' : 'plaintext')
  return { store, s, id }
}

const outline = () => screen.queryByRole('navigation', { name: 'Outline' })

describe('outline panel', () => {
  it('is off until turned on, then lists the headings', () => {
    const { store, s } = setup()
    render(<App />)
    expect(outline()).toBeNull()
    act(() => COMMANDS.find((c) => c.id === 'view.outline')!.run({ store }))
    expect(s().settings.showOutline).toBe(true)
    const items = within(within(outline()!).getByRole('list')).getAllByRole('button')
    expect(items.map((b) => b.textContent)).toEqual(['Plan', 'Week one', 'Week two'])
  })

  it('jumps to a heading when clicked', async () => {
    const { s, id } = setup()
    act(() => s().updateSettings({ showOutline: true }))
    render(<App />)
    await userEvent.click(within(outline()!).getByRole('button', { name: 'Week two' }))
    const view = viewForNote(id)!
    expect(view.state.selection.main.head).toBe(DOC.indexOf('## Week two'))
    expect(view.hasFocus).toBe(true)
  })

  it('marks the heading the cursor is under', () => {
    const { s, id } = setup()
    act(() => s().updateSettings({ showOutline: true }))
    render(<App />)
    act(() => viewForNote(id)!.dispatch({ selection: { anchor: DOC.indexOf('work') } }))
    expect(within(outline()!).getByRole('button', { name: 'Week one' })).toHaveAttribute(
      'aria-current',
      'location',
    )
  })

  it('stays on for other Markdown notes, and says so when a note has no headings', () => {
    const { s } = setup()
    act(() => s().updateSettings({ showOutline: true }))
    const other = s().newNote({ content: 'just text' })
    act(() => s().setLanguage(other, 'markdown'))
    render(<App />)
    expect(within(outline()!).getByText(/No headings yet/)).toBeInTheDocument()
  })

  it('is not shown for plain notes', () => {
    const { s } = setup(false)
    act(() => s().updateSettings({ showOutline: true }))
    render(<App />)
    expect(outline()).toBeNull()
  })

  it('has a close button that turns it off', async () => {
    const { s } = setup()
    act(() => s().updateSettings({ showOutline: true }))
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Close outline' }))
    expect(s().settings.showOutline).toBe(false)
    expect(outline()).toBeNull()
  })
})
