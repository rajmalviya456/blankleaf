import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { stubMedia } from '../../../tests/media'
import { App } from '../../app/App'
import { COMMANDS } from '../../commands/registry'
import { createAppStore, initStore } from '../../store/store'
import { compareStore } from './compareStore'

let media: ReturnType<typeof stubMedia> | undefined
afterEach(() => {
  media?.restore()
  media = undefined
  act(() => compareStore.getState().close())
})

function setup() {
  const store = initStore(createAppStore())
  const s = () => store.getState()
  const draft = s().newNote({ title: 'Draft', content: 'one\ntwo\nthree\n' })
  const id = s().newNote({ title: 'Final', content: 'one\n2\nthree\nfour\n' })
  render(<App />)
  return { store, s, id, draft, user: userEvent.setup() }
}

describe('Compare', () => {
  it('shows an earlier text beside the note, with the changes marked', async () => {
    const { id } = setup()
    act(() =>
      compareStore.getState().open(id, { label: 'Version from 10:02', text: 'one\ntwo\nthree\n' }),
    )
    const dialog = await screen.findByRole('dialog', { name: 'Compare' })
    expect(within(dialog).getByText('Version from 10:02')).toBeInTheDocument()
    expect(within(dialog).getByText('Final (now)')).toBeInTheDocument()
    expect(await within(dialog).findByText('2 changes')).toBeInTheDocument()
    expect(dialog.querySelectorAll('.cm-changedLine').length).toBeGreaterThan(0)
  })

  it('says so when there are no differences', async () => {
    const { id } = setup()
    act(() => compareStore.getState().open(id, { label: 'Copy', text: 'one\n2\nthree\nfour\n' }))
    expect(await screen.findByText('No differences')).toBeInTheDocument()
  })

  it('compares with another note picked from a list', async () => {
    const { user, store } = setup()
    act(() => COMMANDS.find((c) => c.id === 'note.compare')!.run({ store }))
    const dialog = await screen.findByRole('dialog', { name: 'Compare' })
    await user.click(within(dialog).getByRole('button', { name: 'Draft' }))
    expect(await within(dialog).findByText('2 changes')).toBeInTheDocument()
  })

  it('uses one combined view on a phone', async () => {
    media = stubMedia({ phone: true })
    const { id } = setup()
    act(() => compareStore.getState().open(id, { label: 'Earlier', text: 'one\ntwo\nthree\n' }))
    const dialog = await screen.findByRole('dialog', { name: 'Compare' })
    await within(dialog).findByText('2 changes')
    expect(dialog.querySelectorAll('.cm-editor')).toHaveLength(1)
    expect(dialog.querySelector('.cm-deletedChunk')).not.toBeNull()
  })
})
