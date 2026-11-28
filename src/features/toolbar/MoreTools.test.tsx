import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAppStore, initStore } from '../../store/store'
import { toastStore } from '../../ui/toast'
import * as actions from '../backup/actions'
import { printStore } from '../print/printStore'
import { shareStore } from '../share/shareStore'
import { MoreTools } from './MoreTools'

afterEach(() => {
  vi.restoreAllMocks()
  toastStore.getState().clear()
  act(() => {
    printStore.getState().close()
    shareStore.getState().close()
  })
})

function setup(fold: number, { markdown = false } = {}) {
  const store = initStore(createAppStore())
  const s = () => store.getState()
  const id = s().newNote({ content: 'hello', ...(markdown && { mode: 'markdown' as const }) })
  render(<MoreTools noteId={id} fold={fold} view={null} />)
  return { s, id, user: userEvent.setup() }
}
const open = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'More tools' }))
  return screen.findByRole('menu')
}
const names = (menu: HTMLElement) =>
  within(menu)
    .getAllByRole('menuitem')
    .map((el) => el.textContent?.trim())

describe('More tools', () => {
  it('holds the note actions once they are folded away', async () => {
    const { user } = setup(1)
    const menu = await open(user)
    expect(names(menu)).toEqual([
      'Copy all text',
      'Download',
      'Print or save as PDF…',
      'Share via link…',
      'Move to Trash',
    ])
  })

  it('adds the font and text size when those fold too', async () => {
    const { user } = setup(2)
    const menu = await open(user)
    expect(names(menu).slice(0, 3)).toEqual(['Font', 'Smaller text', 'Larger text'])
  })

  it('adds zen mode and the date when the last group folds', async () => {
    const { user } = setup(3)
    const menu = await open(user)
    expect(names(menu).slice(0, 2)).toEqual(['Insert date and time', 'Zen mode'])
  })

  it('leaves out the date for Markdown notes, which have no text tools', async () => {
    const { user } = setup(3, { markdown: true })
    const menu = await open(user)
    expect(names(menu)[0]).toBe('Zen mode')
  })

  it('opens Share and Print for this note', async () => {
    const { user, id } = setup(1)
    await user.click(within(await open(user)).getByRole('menuitem', { name: 'Share via link…' }))
    expect(shareStore.getState().dialogNoteId).toBe(id)
    await user.click(
      within(await open(user)).getByRole('menuitem', { name: 'Print or save as PDF…' }),
    )
    expect(printStore.getState().noteId).toBe(id)
  })

  it('moves the note to Trash with an Undo, in the danger colour', async () => {
    const { user, s, id } = setup(1)
    const trash = within(await open(user)).getByRole('menuitem', { name: 'Move to Trash' })
    expect(trash).toHaveClass('text-danger')
    expect(trash).not.toHaveClass('text-fg')
    await user.click(trash)
    expect(s().notes[id].deletedAt).not.toBeNull()
    expect(toastStore.getState().toasts.at(-1)?.action?.label).toBe('Undo')
  })

  it('downloads in each format from the Download submenu', async () => {
    const save = vi.spyOn(actions, 'exportNote').mockImplementation(() => {})
    const { user, id } = setup(1)
    const menu = await open(user)
    within(menu).getByRole('menuitem', { name: 'Download' }).focus()
    await user.keyboard('{ArrowRight}')
    await user.click(await screen.findByRole('menuitem', { name: 'Original format' }))
    expect(save).toHaveBeenCalledWith(id)
  })

  it('changes the text size and stays open for another step', async () => {
    const { user, s, id } = setup(2)
    const menu = await open(user)
    await user.click(within(menu).getByRole('menuitem', { name: 'Larger text' }))
    await user.click(within(menu).getByRole('menuitem', { name: 'Larger text' }))
    expect(s().notes[id].fontSize).toBe(s().settings.editorFontSize + 2)
    expect(within(menu).getByText(String(s().settings.editorFontSize + 2))).toBeInTheDocument()
  })

  it('picks a font for this note from the Font submenu', async () => {
    const { user, s, id } = setup(2)
    within(await open(user))
      .getByRole('menuitem', { name: 'Font' })
      .focus()
    await user.keyboard('{ArrowRight}')
    await user.click(await screen.findByRole('menuitemradio', { name: 'Serif' }))
    expect(s().notes[id].font).toBe('serif')
  })
})
