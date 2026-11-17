import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { stubMedia } from '../../../tests/media'
import { App } from '../../app/App'
import { createAppStore, initStore } from '../../store/store'
import { phoneStore } from './phoneStore'
import { setShareHost } from '../share/shareStore'
import type { ShareHost } from '../share/host'

let media: ReturnType<typeof stubMedia>
beforeEach(() => phoneStore.setState({ stack: [], previewByTab: {} }))
afterEach(() => media?.restore())

function setup(phone = true) {
  media = stubMedia({ phone })
  const store = initStore(createAppStore())
  const s = () => store.getState()
  render(<App />)
  return { s, user: userEvent.setup() }
}
const topBar = () => screen.getByRole('banner', { name: 'Note bar' })

describe('PhoneShell', () => {
  it('phone: top bar instead of tab strip, rail and status bar', async () => {
    const { s } = setup()
    act(() => void s().newNote())
    expect(await screen.findByRole('banner', { name: 'Note bar' })).toBeInTheDocument()
    expect(screen.queryByRole('tablist', { name: 'Open notes' })).toBeNull()
    expect(screen.queryByRole('navigation', { name: 'Sidebar' })).toBeNull()
    expect(screen.queryByRole('status', { name: 'Status bar' })).toBeNull()
  })

  it('laptop: existing layout untouched', () => {
    const { s } = setup(false)
    act(() => void s().newNote())
    expect(screen.getByRole('tablist', { name: 'Open notes' })).toBeInTheDocument()
    expect(screen.queryByRole('banner', { name: 'Note bar' })).toBeNull()
  })

  it('title shows the note and opens the tabs sheet', async () => {
    const { s, user } = setup()
    act(() => {
      const id = s().newNote()
      s().updateContent(id, 'Sprint sync\nmore')
    })
    await user.click(
      await within(await screen.findByRole('banner', { name: 'Note bar' })).findByRole('button', {
        name: 'Open tabs: Sprint sync',
      }),
    )
    expect(phoneStore.getState().stack).toEqual(['tabs'])
  })

  it('with no note open: "Notepadz" title and a New note button', async () => {
    setup()
    expect(
      await within(await screen.findByRole('banner', { name: 'Note bar' })).findByRole('button', {
        name: 'Open tabs: Notepadz',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New note' })).toBeInTheDocument()
  })

  it('Library and Note menu buttons open their overlays', async () => {
    const { s, user } = setup()
    act(() => void s().newNote())
    await user.click(
      await within(await screen.findByRole('banner', { name: 'Note bar' })).findByRole('button', {
        name: 'Library',
      }),
    )
    await user.click(within(topBar()).getByRole('button', { name: 'Note menu' }))
    expect(phoneStore.getState().stack).toEqual(['library', 'menu'])
  })

  it('Preview toggle is markdown-only and never changes the saved (laptop) view', async () => {
    const { s, user } = setup()
    let id = ''
    act(() => {
      id = s().newNote()
      s().updateContent(id, '# Title')
    })
    expect(
      within(await screen.findByRole('banner', { name: 'Note bar' })).queryByRole('button', {
        name: 'Preview',
      }),
    ).toBeNull()
    act(() => {
      s().setNoteMode(id, 'markdown')
      s().setViewState(id, { previewMode: 'split' })
    })
    // split on the laptop shows Edit on the phone
    expect(document.querySelector('.cm-editor')).not.toBeNull()
    await user.click(within(topBar()).getByRole('button', { name: 'Preview' }))
    expect(await screen.findByRole('article', { name: 'Markdown preview' })).toBeInTheDocument()
    expect(document.querySelector('.cm-editor')).toBeNull()
    expect(s().session.perTab[id].previewMode).toBe('split')
    await user.click(within(topBar()).getByRole('button', { name: 'Edit' }))
    expect(document.querySelector('.cm-editor')).not.toBeNull()
  })

  it('save state: hidden when saved, "Saving…" while saving, "Not saved" on error', async () => {
    const { s } = setup()
    act(() => void s().newNote())
    const bar = await screen.findByRole('banner', { name: 'Note bar' })
    expect(within(bar).queryByText('Saving…')).toBeNull()
    act(() => s().setSaveStatus('saving'))
    expect(within(bar).getByText('Saving…')).toBeInTheDocument()
    act(() => s().setSaveStatus('error', 'Disk full'))
    expect(within(bar).getByRole('button', { name: 'Not saved' })).toBeInTheDocument()
  })

  it('sharing dot on Library and Note menu only while a share is active', async () => {
    const { s } = setup()
    act(() => void s().newNote())
    const bar = await screen.findByRole('banner', { name: 'Note bar' })
    expect(within(bar).getByRole('button', { name: 'Library' })).toBeInTheDocument()
    const rows = [{ id: 'x', title: 't', expiresAt: Date.now() + 60_000 }]
    act(() =>
      setShareHost({ subscribe: () => () => {}, active: () => rows } as unknown as ShareHost),
    )
    // re-render by toggling a store value the bar reads
    act(() => s().setSaveStatus('saved'))
    act(() => void s().newNote())
    expect(within(topBar()).getByRole('button', { name: 'Library · sharing' })).toBeInTheDocument()
    expect(
      within(topBar()).getByRole('button', { name: 'Note menu · sharing' }),
    ).toBeInTheDocument()
    act(() => setShareHost(null))
  })
})
