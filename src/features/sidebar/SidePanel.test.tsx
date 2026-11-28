import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Rail } from '../../app/layout/Rail'
import { SidePanel } from '../../app/layout/SidePanel'
import { createAppStore, initStore } from '../../store/store'
import { toastStore } from '../../ui/toast'
import { stubMedia } from '../../../tests/media'

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

  it('search box has an app-styled clear button instead of the browser one', async () => {
    const { s, user } = setup()
    act(() => s().setSidebar({ open: true, panel: 'search' }))
    const box = screen.getByRole('searchbox')
    expect(screen.queryByRole('button', { name: /clear search/i })).toBeNull()
    await user.type(box, 'abc')
    await user.click(screen.getByRole('button', { name: /clear search/i }))
    expect(box).toHaveValue('')
    expect(box).toHaveFocus()
  })

  it('moves a note to Trash from the list without opening it, with undo', async () => {
    const { s, mk, user } = setup()
    const keep = mk('keep me')
    const gone = mk('delete me')
    act(() => s().closeTab(gone))
    act(() => s().setActive(keep))
    await user.click(screen.getByRole('button', { name: 'Notes' }))
    await user.click(screen.getByRole('button', { name: 'Move “delete me” to Trash' }))
    expect(s().notes[gone].deletedAt).not.toBeNull()
    expect(s().session.openTabIds).not.toContain(gone) // never opened
    expect(s().session.activeTabId).toBe(keep)
    const t = toastStore.getState().toasts.at(-1)!
    expect(t.msg).toBe('Moved “delete me” to Trash')
    act(() => t.action!.run())
    expect(s().notes[gone].deletedAt).toBeNull()
  })

  it('a note row menu (touch screens) opens its version history', async () => {
    const media = stubMedia({ touch: true })
    const { s, mk, user } = setup()
    const id = mk('old words')
    act(() => s().closeTab(id))
    const { historyStore } = await import('../history/historyStore')
    await user.click(screen.getByRole('button', { name: 'Notes' }))
    await user.click(screen.getByRole('button', { name: 'Actions for old words' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Version history…' }))
    expect(historyStore.getState().noteId).toBe(id)
    act(() => historyStore.getState().close())
    media.restore()
  })

  it('a note row menu shows Move to Trash in the danger colour (no competing colour)', async () => {
    const media = stubMedia({ touch: true })
    const { mk, user } = setup()
    mk('old words')
    await user.click(screen.getByRole('button', { name: 'Notes' }))
    await user.click(screen.getByRole('button', { name: 'Actions for old words' }))
    const trash = await screen.findByRole('menuitem', { name: 'Move to Trash' })
    expect(trash).toHaveClass('text-danger')
    expect(trash).not.toHaveClass('text-fg')
    await user.keyboard('{Escape}')
    media.restore()
  })

  it('Delete key on a focused note row moves it to Trash', async () => {
    const { s, mk, user } = setup()
    const id = mk('press delete')
    await user.click(screen.getByRole('button', { name: 'Notes' }))
    const list = screen.getByRole('list', { name: 'Notes' })
    within(list).getByText('press delete').closest('button')!.focus()
    await user.keyboard('{Delete}')
    expect(s().notes[id].deletedAt).not.toBeNull()
  })

  it('names the search box and announces how many notes were found', async () => {
    const { s, mk, user } = setup()
    mk('the needle is here')
    mk('another needle')
    mk('nothing')
    act(() => s().setSidebar({ open: true, panel: 'search' }))
    const box = screen.getByRole('searchbox', { name: 'Search all notes' })
    await user.type(box, 'needle')
    expect(await screen.findByRole('status')).toHaveTextContent('2 notes found')
    await user.type(box, 'zzz')
    expect(await screen.findByRole('status')).toHaveTextContent('No notes found')
    await user.clear(box)
    expect(screen.getByRole('status')).toHaveTextContent('')
  })

  it('Enter that only confirms IME text does not open a result', async () => {
    const { s, mk, user } = setup()
    const a = mk('first')
    const b = mk('second needle')
    act(() => s().setActive(a))
    act(() => s().setSidebar({ open: true, panel: 'search' }))
    const box = screen.getByRole('searchbox')
    await user.type(box, 'needle')
    await screen.findByRole('button', { name: /second needle/i })
    fireEvent.keyDown(box, { key: 'Enter', isComposing: true })
    expect(s().session.activeTabId).toBe(a)
    expect(b).toBeDefined()
  })

  it('after Delete on a row, focus moves to the next row, not the page', async () => {
    const { mk, user } = setup()
    mk('older')
    mk('press delete')
    await user.click(screen.getByRole('button', { name: 'Notes' }))
    const list = screen.getByRole('list', { name: 'Notes' })
    within(list).getByText('press delete').closest('button')!.focus()
    await user.keyboard('{Delete}')
    expect(document.activeElement).toBe(within(list).getByText('older').closest('button'))
  })

  it('undo after Move to Trash keeps the note pinned', async () => {
    const { s, mk, user } = setup()
    const id = mk('pinned one')
    act(() => s().togglePin(id))
    await user.click(screen.getByRole('button', { name: 'Notes' }))
    await user.click(screen.getByRole('button', { name: 'Move “pinned one” to Trash' }))
    act(() => toastStore.getState().toasts.at(-1)!.action!.run())
    expect(s().notes[id].deletedAt).toBeNull()
    expect(s().notes[id].pinned).toBe(true)
  })
})
