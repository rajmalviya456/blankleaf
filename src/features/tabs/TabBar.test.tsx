import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createAppStore, initStore } from '../../store/store'
import { TabBar } from './TabBar'

function setup(contents: string[] = ['first', 'second']) {
  const store = initStore(createAppStore())
  const ids = contents.map((c) => {
    const id = store.getState().newNote()
    store.getState().updateContent(id, c)
    return id
  })
  const user = userEvent.setup()
  render(<TabBar />)
  return { store, ids, user, s: () => store.getState() }
}

const tab = (name: string | RegExp) => screen.getByRole('tab', { name })

describe('TabBar', () => {
  it('renders one tab per open note with the active one selected', () => {
    setup()
    expect(screen.getAllByRole('tab')).toHaveLength(2)
    expect(tab(/second/)).toHaveAttribute('aria-selected', 'true')
    expect(tab(/first/)).toHaveAttribute('aria-selected', 'false')
  })

  it('clicking a tab selects it', async () => {
    const { user, ids, s } = setup()
    await user.click(tab(/first/))
    expect(s().session.activeTabId).toBe(ids[0])
  })

  it('clicking + creates and selects a new tab', async () => {
    const { user, s } = setup()
    await user.click(screen.getByRole('button', { name: /new note/i }))
    expect(screen.getAllByRole('tab')).toHaveLength(3)
    expect(tab(/untitled/i)).toHaveAttribute('aria-selected', 'true')
    expect(s().session.openTabIds).toHaveLength(3)
  })

  it('double-click on tab shows rename input; Enter commits, Escape cancels', async () => {
    const { user, ids, s } = setup()
    await user.dblClick(tab(/first/))
    const input = screen.getByRole('textbox', { name: /rename/i })
    await user.clear(input)
    await user.type(input, 'Plan{Enter}')
    expect(s().notes[ids[0]].title).toBe('Plan')
    expect(screen.queryByRole('textbox', { name: /rename/i })).toBeNull()

    await user.dblClick(tab(/Plan/))
    await user.type(screen.getByRole('textbox', { name: /rename/i }), 'zzz{Escape}')
    expect(s().notes[ids[0]].title).toBe('Plan')
  })

  it('middle-click closes a tab', () => {
    const { ids, s } = setup()
    fireEvent(tab(/first/), new MouseEvent('auxclick', { bubbles: true, button: 1 }))
    expect(s().session.openTabIds).toEqual([ids[1]])
  })

  it('close button closes a tab', async () => {
    const { user, ids, s } = setup()
    await user.click(screen.getByLabelText('Close first'))
    expect(s().session.openTabIds).toEqual([ids[1]])
  })

  it('pinned tab shows pin indicator and closing it opens unpin prompt', async () => {
    const { user, ids, s } = setup()
    act(() => s().togglePin(ids[0]))
    expect(within(tab(/first/)).getByLabelText(/pinned/i)).toBeInTheDocument()
    fireEvent(tab(/first/), new MouseEvent('auxclick', { bubbles: true, button: 1 }))
    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toHaveTextContent(/unpin/i)
    await user.click(within(dialog).getByRole('button', { name: /unpin and close/i }))
    expect(s().notes[ids[0]].pinned).toBe(false)
    expect(s().session.openTabIds).toEqual([ids[1]])
  })

  it('context menu lists all tab actions', async () => {
    setup()
    fireEvent.contextMenu(tab(/first/))
    const menu = await screen.findByRole('menu')
    const names = within(menu)
      .getAllByRole('menuitem')
      .map((el) => el.textContent?.trim())
    expect(names).toEqual([
      'Rename',
      'Pin',
      'Duplicate',
      'Close',
      'Close others',
      'Close to the right',
      'Move to Trash',
      'Copy content',
      'Export',
      'Share…',
      'Version history…',
    ])
  })

  it('context menu Move to Trash trashes the note', async () => {
    const { user, ids, s } = setup()
    fireEvent.contextMenu(tab(/first/))
    await user.click(await screen.findByRole('menuitem', { name: 'Move to Trash' }))
    expect(s().notes[ids[0]].deletedAt).not.toBeNull()
  })

  it('hides the open-tabs menu unless at least two tabs have something to list', () => {
    const { s } = setup(['only one'])
    const menu = () => screen.queryByRole('button', { name: /all open tabs/i })
    expect(menu()).toBeNull()
    let blank = ''
    act(() => void (blank = s().newNote()))
    expect(menu()).toBeNull() // a blank "Untitled" tab doesn't count
    act(() => s().updateContent(blank, '   \n  '))
    expect(menu()).toBeNull() // whitespace is still blank
    act(() => s().updateContent(blank, 'second note'))
    expect(menu()).toBeInTheDocument()
    act(() => s().closeTab(blank))
    expect(menu()).toBeNull()
  })

  it('lists only tabs with a title or text', async () => {
    const user = userEvent.setup()
    const { s } = setup(['alpha', 'beta'])
    act(() => void s().newNote())
    await user.click(screen.getByRole('button', { name: /all open tabs/i }))
    const items = await screen.findAllByRole('menuitem')
    expect(items.map((i) => i.textContent)).toEqual(['alpha', 'beta'])
  })
})
