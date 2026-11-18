import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { stubMedia } from '../../../tests/media'
import { App } from '../../app/App'
import { createAppStore, initStore } from '../../store/store'
import { toastStore } from '../../ui/toast'
import type { ShareHost } from '../share/host'
import { setShareHost } from '../share/shareStore'
import { phoneStore } from './phoneStore'

let media: ReturnType<typeof stubMedia>
beforeEach(() => phoneStore.setState({ stack: [], previewByTab: {}, librarySection: 'notes' }))
afterEach(() => media?.restore())

function setup(titles: string[]) {
  media = stubMedia({ phone: true, touch: true })
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
const openLibrary = async () => {
  act(() => phoneStore.getState().open('library'))
  return screen.findByRole('dialog', { name: 'Library' })
}

describe('Library', () => {
  it('opens on Notes; tapping a note opens it and closes the Library', async () => {
    const { s, ids, user } = setup(['alpha', 'beta'])
    act(() => s().closeTab(ids[0]))
    const lib = await openLibrary()
    expect(within(lib).getByRole('tab', { name: 'Notes' })).toHaveAttribute('aria-selected', 'true')
    await user.click(within(lib).getByText('alpha'))
    expect(s().session.activeTabId).toBe(ids[0])
    expect(phoneStore.getState().stack).toEqual([])
  })

  it('Search: the box takes focus and a result opens at the match', async () => {
    const { s, ids, user } = setup(['alpha', 'needle in here'])
    act(() => s().setActive(ids[0]))
    const lib = await openLibrary()
    await user.click(within(lib).getByRole('tab', { name: 'Search' }))
    const box = await within(lib).findByRole('searchbox')
    expect(box).toHaveFocus()
    await user.type(box, 'needle{Enter}')
    expect(s().session.activeTabId).toBe(ids[1])
    expect(phoneStore.getState().stack).toEqual([])
  })

  it('Trash: Restore is visible; permanent delete asks first', async () => {
    const { s, ids, user } = setup(['alpha'])
    act(() => s().trashNote(ids[0]))
    const lib = await openLibrary()
    await user.click(within(lib).getByRole('tab', { name: 'Trash' }))
    expect(within(lib).getByRole('button', { name: 'Restore alpha' })).toBeInTheDocument()
    await user.click(within(lib).getByRole('button', { name: 'Delete alpha permanently' }))
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
  })

  it('note row ⋯ → Move to Trash: Undo toast, note never opened', async () => {
    const { s, ids, user } = setup(['alpha', 'beta'])
    act(() => s().closeTab(ids[0]))
    const lib = await openLibrary()
    await user.click(within(lib).getByRole('button', { name: 'Actions for alpha' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Move to Trash' }))
    expect(s().notes[ids[0]].deletedAt).not.toBeNull()
    expect(s().session.openTabIds).not.toContain(ids[0])
    expect(toastStore.getState().toasts.at(-1)?.action?.label).toBe('Undo')
  })

  it('footer opens Settings, What’s new and About, and cycles the theme', async () => {
    const { s, user } = setup(['alpha'])
    let lib = await openLibrary()
    await user.click(within(lib).getByRole('button', { name: 'Settings' }))
    expect(s().ui.settingsOpen).toBe(true)
    act(() => s().setUi({ settingsOpen: false }))
    lib = await openLibrary()
    await user.click(within(lib).getByRole('button', { name: 'What’s new' }))
    expect(s().ui.whatsNewOpen).toBe(true)
    act(() => s().setUi({ whatsNewOpen: false }))
    lib = await openLibrary()
    await user.click(within(lib).getByRole('button', { name: 'About' }))
    expect(s().ui.aboutOpen).toBe(true)
    act(() => s().setUi({ aboutOpen: false }))
    lib = await openLibrary()
    const before = s().settings.theme
    await user.click(within(lib).getByRole('button', { name: /^Theme:/ }))
    expect(s().settings.theme).not.toBe(before)
  })

  it('active shares row only while sharing; it opens the shares sheet', async () => {
    const { user } = setup(['alpha'])
    let lib = await openLibrary()
    expect(within(lib).queryByRole('button', { name: /^Sharing/ })).toBeNull()
    const rows = [
      {
        id: 'x',
        noteId: 'n',
        title: 'alpha',
        createdAt: Date.now(),
        expiresAt: Date.now() + 120_000,
        opens: 0,
        password: null,
      },
    ]
    act(() =>
      setShareHost({
        subscribe: () => () => {},
        active: () => rows,
        stop: async () => {},
        messageFor: () => '',
      } as unknown as ShareHost),
    )
    act(() => phoneStore.getState().closeAll())
    lib = await openLibrary()
    await user.click(within(lib).getByRole('button', { name: /^Sharing 1 note/ }))
    expect(await screen.findByRole('dialog', { name: 'Active shares' })).toBeInTheDocument()
    act(() => setShareHost(null))
  })
})
