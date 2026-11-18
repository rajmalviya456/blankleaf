import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stubMedia } from '../../../tests/media'
import { App } from '../../app/App'
import { COMMANDS } from '../../commands/registry'
import { createAppStore, initStore } from '../../store/store'
import { toastStore } from '../../ui/toast'
import * as download from '../backup/download'
import { phoneStore } from '../phone/phoneStore'
import { exportNoteAs } from './exportNote'
import * as docx from './noteDocx'

let media: ReturnType<typeof stubMedia> | undefined
let save: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  save = vi.spyOn(download, 'downloadBlob').mockImplementation(() => {})
})
afterEach(() => {
  vi.restoreAllMocks()
  media?.restore()
  phoneStore.setState({ stack: [] })
})

function setup() {
  const store = initStore(createAppStore())
  const id = store.getState().newNote({ title: 'Trip: plan?', content: '# Hi', mode: 'markdown' })
  return { store, id }
}

describe('exporting a note', () => {
  it('names files after the note, safely', async () => {
    const { id } = setup()
    await exportNoteAs(id, 'html')
    expect(save.mock.calls[0][0]).toBe('Trip- plan-.html')
    await exportNoteAs(id, 'docx')
    expect(save.mock.calls[1][0]).toBe('Trip- plan-.docx')
  })

  it('says so if the file can’t be made', async () => {
    const { id } = setup()
    vi.spyOn(docx, 'noteToDocx').mockRejectedValue(new Error('boom'))
    await exportNoteAs(id, 'docx')
    expect(save).not.toHaveBeenCalled()
    expect(toastStore.getState().toasts.at(-1)?.msg).toMatch(/Couldn’t create the Word document/)
  })

  it('offers both formats in the palette', () => {
    const titles = COMMANDS.map((c) => c.title)
    expect(titles).toEqual(
      expect.arrayContaining(['Export as web page (.html)', 'Export as Word (.docx)']),
    )
  })

  it('offers them from the laptop toolbar', async () => {
    setup()
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Download note' }))
    expect(await screen.findByRole('menuitem', { name: /^Original format/ })).toBeInTheDocument()
    await user.click(screen.getByRole('menuitem', { name: 'Word document (.docx)' }))
    await waitFor(() => expect(save).toHaveBeenCalledOnce())
  })

  it('offers them from the phone note menu', async () => {
    media = stubMedia({ phone: true, touch: true })
    setup()
    render(<App />)
    act(() => phoneStore.getState().open('menu'))
    const menu = await screen.findByRole('dialog', { name: 'Note menu' })
    await userEvent.click(within(menu).getByRole('button', { name: 'Export as web page' }))
    await waitFor(() => expect(save).toHaveBeenCalledOnce())
    expect(within(document.body).queryByRole('dialog', { name: 'Note menu' })).toBeNull()
  })
})
