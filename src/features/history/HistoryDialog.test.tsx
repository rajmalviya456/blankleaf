import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { stubMedia } from '../../../tests/media'
import { App } from '../../app/App'
import { COMMANDS } from '../../commands/registry'
import { openDb, type BlankleafDB } from '../../db/db'
import { listVersions, saveVersion } from '../../db/versionsRepo'
import { registerStorage } from '../../store/dataReset'
import { createAppStore, initStore } from '../../store/store'
import { toastStore } from '../../ui/toast'
import { phoneStore } from '../phone/phoneStore'
import { historyStore } from './historyStore'

let db: BlankleafDB
let media: ReturnType<typeof stubMedia> | undefined
afterEach(async () => {
  media?.restore()
  act(() => historyStore.getState().close())
  registerStorage(null, null)
  db.close()
  await db.delete()
})

async function setup(phone = false) {
  media = stubMedia({ phone, touch: phone })
  phoneStore.setState({ stack: [] })
  db = openDb(`history-${Math.random()}`)
  registerStorage(db, null)
  const store = initStore(createAppStore())
  const s = () => store.getState()
  const id = s().newNote()
  s().updateContent(id, 'current text')
  await saveVersion(db, id, 'first draft', Date.now() - 3_600_000)
  await saveVersion(db, id, 'second draft', Date.now() - 600_000)
  render(<App />)
  return { s, id, user: userEvent.setup() }
}

describe.each([
  ['laptop', false],
  ['phone', true],
])('version history (%s)', (_, phone) => {
  it('lists versions newest first, previews one and restores it, with Undo', async () => {
    const { s, id, user } = await setup(phone)
    act(() => historyStore.getState().open(id))
    const dialog = await screen.findByRole('dialog', { name: 'Version history' })
    await waitFor(() => expect(within(dialog).getAllByRole('option')).toHaveLength(3))
    const items = within(dialog).getAllByRole('option')
    expect(items.map((o) => o.textContent)).toEqual([
      expect.stringMatching(/^Now/),
      expect.stringContaining('second draft'),
      expect.stringContaining('first draft'),
    ])
    await user.click(items[2])
    expect(within(dialog).getByRole('region', { name: 'Version text' })).toHaveTextContent(
      'first draft',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Restore this version' }))
    expect(s().notes[id].content).toBe('first draft')
    expect(screen.queryByRole('dialog', { name: 'Version history' })).toBeNull()
    // What was there before is kept as a version, and Undo brings it straight back.
    await waitFor(async () => expect((await listVersions(db, id))[0].content).toBe('current text'))
    act(() => toastStore.getState().toasts.at(-1)!.action!.run())
    expect(s().notes[id].content).toBe('current text')
  })
})

describe('opening version history', () => {
  it('is a palette command for the active note', async () => {
    const { s, id } = await setup()
    const cmd = COMMANDS.find((c) => c.id === 'note.history')!
    expect(cmd.title).toBe('Version history…')
    act(() => cmd.run({ store: { getState: s } as never }))
    expect(historyStore.getState().noteId).toBe(id)
  })

  it('says so when a note has no earlier versions yet', async () => {
    const { s } = await setup()
    const fresh = s().newNote()
    act(() => historyStore.getState().open(fresh))
    const dialog = await screen.findByRole('dialog', { name: 'Version history' })
    expect(await within(dialog).findByText(/No earlier versions yet/)).toBeInTheDocument()
  })

  it('on phones, Back closes it', async () => {
    const { id } = await setup(true)
    act(() => historyStore.getState().open(id))
    await screen.findByRole('dialog', { name: 'Version history' })
    expect(phoneStore.getState().stack).toEqual([{ kind: 'app', id: 'history' }])
  })
})
