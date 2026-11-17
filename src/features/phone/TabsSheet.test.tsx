import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { stubMedia } from '../../../tests/media'
import { App } from '../../app/App'
import { createAppStore, initStore } from '../../store/store'
import { phoneStore } from './phoneStore'

let media: ReturnType<typeof stubMedia>
beforeEach(() => phoneStore.setState({ stack: [], previewByTab: {} }))
afterEach(() => media?.restore())

function setup(titles: string[]) {
  media = stubMedia({ phone: true })
  const store = initStore(createAppStore())
  const s = () => store.getState()
  const ids = titles.map((t) => {
    const id = s().newNote()
    s().updateContent(id, t)
    return id
  })
  render(<App />)
  return { s, ids, user: userEvent.setup() }
}
const openSheet = async () => {
  act(() => phoneStore.getState().open('tabs'))
  return screen.findByRole('dialog', { name: 'Open tabs' })
}

describe('Tabs sheet', () => {
  it('tapping a row activates that tab and closes the sheet', async () => {
    const { s, ids, user } = setup(['alpha', 'beta'])
    const sheet = await openSheet()
    await user.click(within(sheet).getByRole('button', { name: 'alpha' }))
    expect(s().session.activeTabId).toBe(ids[0])
    expect(phoneStore.getState().stack).toEqual([])
  })

  it('marks the active tab and lists pinned tabs first', async () => {
    const { s, ids } = setup(['alpha', 'beta'])
    act(() => s().togglePin(ids[1]))
    const sheet = await openSheet()
    const rows = within(sheet).getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('beta')
    expect(within(sheet).getByRole('button', { name: 'beta' })).toHaveAttribute(
      'aria-current',
      'true',
    )
  })

  it('every laptop tab-menu action is reachable from the row actions', async () => {
    const { user } = setup(['alpha'])
    const sheet = await openSheet()
    await user.click(within(sheet).getByRole('button', { name: 'Actions for alpha' }))
    const actions = await screen.findByRole('dialog', { name: 'alpha' })
    for (const label of [
      'Rename',
      'Pin',
      'Duplicate',
      'Share…',
      'Copy text',
      'Download',
      'Close',
      'Close others',
      'Close tabs below',
      'Move up',
      'Move down',
      'Move to Trash',
    ])
      expect(within(actions).getByRole('button', { name: label })).toBeInTheDocument()
  })

  it('row actions run: Duplicate adds a tab, Close others leaves one', async () => {
    const { s, user } = setup(['alpha', 'beta'])
    let sheet = await openSheet()
    await user.click(within(sheet).getByRole('button', { name: 'Actions for alpha' }))
    await user.click(
      within(await screen.findByRole('dialog', { name: 'alpha' })).getByRole('button', {
        name: 'Duplicate',
      }),
    )
    expect(s().session.openTabIds).toHaveLength(3)
    sheet = await openSheet()
    await user.click(within(sheet).getByRole('button', { name: 'Actions for beta' }))
    await user.click(
      within(await screen.findByRole('dialog', { name: 'beta' })).getByRole('button', {
        name: 'Close others',
      }),
    )
    expect(s().session.openTabIds).toHaveLength(1)
  })

  it('closing a pinned tab asks to unpin first', async () => {
    const { s, ids, user } = setup(['alpha', 'beta'])
    act(() => s().togglePin(ids[0]))
    const sheet = await openSheet()
    await user.click(within(sheet).getByRole('button', { name: 'Close alpha' }))
    const prompt = await screen.findByRole('alertdialog', { name: /unpin “alpha”/i })
    await user.click(within(prompt).getByRole('button', { name: 'Unpin and close' }))
    expect(s().session.openTabIds).not.toContain(ids[0])
  })

  it('rename inline: Enter commits, Escape cancels', async () => {
    const { s, ids, user } = setup(['alpha'])
    const sheet = await openSheet()
    await user.click(within(sheet).getByRole('button', { name: 'Actions for alpha' }))
    await user.click(
      within(await screen.findByRole('dialog', { name: 'alpha' })).getByRole('button', {
        name: 'Rename',
      }),
    )
    const field = await screen.findByRole('textbox', { name: 'Rename note' })
    await user.clear(field)
    await user.type(field, 'Groceries{Enter}')
    expect(s().notes[ids[0]].title).toBe('Groceries')
  })

  it('reorder: a drag handle per row, and Move down in the row actions', async () => {
    const { s, ids, user } = setup(['alpha', 'beta'])
    const sheet = await openSheet()
    expect(within(sheet).getByRole('button', { name: 'Reorder alpha' })).toBeInTheDocument()
    await user.click(within(sheet).getByRole('button', { name: 'Actions for alpha' }))
    await user.click(
      within(await screen.findByRole('dialog', { name: 'alpha' })).getByRole('button', {
        name: 'Move down',
      }),
    )
    expect(s().session.openTabIds).toEqual([ids[1], ids[0]])
  })

  it('30 tabs and a very long title: the list scrolls and titles truncate', async () => {
    setup(['x'.repeat(200), ...Array.from({ length: 29 }, (_, i) => `note ${i}`)])
    const sheet = await openSheet()
    const list = within(sheet).getByRole('list', { name: 'Open tabs' })
    expect(list.className).toContain('overflow-y-auto')
    expect(within(sheet).getAllByRole('listitem')).toHaveLength(30)
    const long = within(sheet).getByRole('button', { name: 'x'.repeat(40) })
    expect(long.querySelector('.truncate')).not.toBeNull()
  })

  it('footer: New note, and Reopen closed tab only when something was closed', async () => {
    const { s, ids, user } = setup(['alpha', 'beta'])
    let sheet = await openSheet()
    expect(within(sheet).getByRole('button', { name: 'Reopen closed tab' })).toBeDisabled()
    act(() => s().closeTab(ids[1]))
    sheet = await screen.findByRole('dialog', { name: 'Open tabs' })
    await user.click(within(sheet).getByRole('button', { name: 'Reopen closed tab' }))
    expect(s().session.openTabIds).toContain(ids[1])
    sheet = await openSheet()
    await user.click(within(sheet).getByRole('button', { name: 'New note' }))
    expect(s().session.openTabIds).toHaveLength(3)
  })
})
