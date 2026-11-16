import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Rail } from '../../app/layout/Rail'
import { SidePanel } from '../../app/layout/SidePanel'
import { createAppStore, initStore } from '../../store/store'

function setup() {
  const store = initStore(createAppStore())
  const s = () => store.getState()
  const mk = (content: string) => {
    const id = s().newNote()
    s().updateContent(id, content)
    return id
  }
  const user = userEvent.setup()
  render(
    <>
      <Rail />
      <SidePanel />
    </>,
  )
  return { s, mk, user }
}

describe('Rail + SidePanel', () => {
  it('rail buttons open, switch and close the panel', async () => {
    const { s, user } = setup()
    const notes = screen.getByRole('button', { name: 'Notes' })
    expect(notes).toHaveAttribute('aria-pressed', 'false')
    await user.click(notes)
    expect(s().session.sidebar).toEqual({ open: true, panel: 'notes' })
    expect(notes).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Search' }))
    expect(s().session.sidebar).toEqual({ open: true, panel: 'search' })
    await user.click(screen.getByRole('button', { name: 'Search' }))
    expect(s().session.sidebar.open).toBe(false)
  })

  it('notes list shows notes and opens one on click', async () => {
    const { s, mk, user } = setup()
    const a = mk('alpha note')
    mk('beta note')
    s().closeTab(a)
    act(() => s().setSidebar({ open: true, panel: 'notes' }))
    const list = screen.getByRole('list', { name: /notes/i })
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    await user.click(within(list).getByText('alpha note'))
    expect(s().session.activeTabId).toBe(a)
    expect(s().session.openTabIds).toContain(a)
  })

  it('search finds text and reveals the first match in the note', async () => {
    const { s, mk, user } = setup()
    const a = mk('first line\nthe needle is here')
    mk('other')
    act(() => s().setSidebar({ open: true, panel: 'search' }))
    await user.type(screen.getByRole('searchbox'), 'needle')
    const hit = await screen.findByRole('button', { name: /first line/i })
    expect(within(hit).getByText('needle', { selector: 'mark' })).toBeInTheDocument()
    await user.click(hit)
    expect(s().session.activeTabId).toBe(a)
    expect(s().ui.reveal).toMatchObject({ noteId: a, from: 15, to: 21 })
  })

  it('restore moves note back to list', async () => {
    const { s, mk, user } = setup()
    const a = mk('to be trashed')
    s().trashNote(a)
    act(() => s().setSidebar({ open: true, panel: 'trash' }))
    await user.click(screen.getByRole('button', { name: /restore to be trashed/i }))
    expect(s().notes[a].deletedAt).toBeNull()
    act(() => s().setSidebar({ panel: 'notes' }))
    expect(screen.getByText('to be trashed')).toBeInTheDocument()
  })

  it('Delete permanently asks for confirmation', async () => {
    const { s, mk, user } = setup()
    const a = mk('gone soon')
    s().trashNote(a)
    act(() => s().setSidebar({ open: true, panel: 'trash' }))
    await user.click(screen.getByRole('button', { name: /delete gone soon permanently/i }))
    const dialog = await screen.findByRole('alertdialog')
    expect(s().notes[a]).toBeDefined()
    await user.click(within(dialog).getByRole('button', { name: /delete permanently/i }))
    expect(s().notes[a]).toBeUndefined()
  })

  it('empty trash asks first and removes all trashed notes', async () => {
    const { s, mk, user } = setup()
    const a = mk('one')
    const b = mk('two')
    s().trashNote(a)
    s().trashNote(b)
    act(() => s().setSidebar({ open: true, panel: 'trash' }))
    await user.click(screen.getByRole('button', { name: /empty trash/i }))
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: /empty trash/i }),
    )
    expect(s().notes[a]).toBeUndefined()
    expect(s().notes[b]).toBeUndefined()
  })
})
