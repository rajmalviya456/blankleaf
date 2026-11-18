import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { stubMedia } from '../../../tests/media'
import { App } from '../../app/App'
import { COMMANDS, commandEnabled } from '../../commands/registry'
import { openDb, type BlankleafDB } from '../../db/db'
import { listVersions, saveVersion } from '../../db/versionsRepo'
import { cleanLocked } from '../../domain/locked'
import { registerStorage } from '../../store/dataReset'
import { startPersistence, type Persistence } from '../../store/persistence'
import { createAppStore, initStore } from '../../store/store'
import { backupText, parseBackup } from '../backup/backup'
import { searchNotes } from '../sidebar/search'
import { phoneStore } from '../phone/phoneStore'
import {
  __setLockIterations,
  LOCK_ITERATIONS,
  newLockKey,
  seal,
  unseal,
  WrongPasswordError,
} from './lockCrypto'
import { LOCKED_TITLE, lockNote } from './lockNote'
import { lockStore } from './lockStore'

const SECRET = 'my bank pin is 4921'
const PASSWORD = 'correct horse'

beforeAll(() => __setLockIterations(1000))
afterAll(() => __setLockIterations(LOCK_ITERATIONS))

let db: BlankleafDB
let persistence: Persistence
let media: ReturnType<typeof stubMedia> | undefined

function setup(patch = {}) {
  const store = initStore(createAppStore())
  const s = () => store.getState()
  const id = s().newNote({ content: SECRET, ...patch })
  persistence = startPersistence(store, db, { contentDelay: 0, sessionDelay: 0 })
  registerStorage(db, persistence)
  return { store, s, id }
}

beforeEach(() => {
  db = openDb(`lock-${Math.random()}`)
  localStorage.clear()
})
afterEach(async () => {
  media?.restore()
  media = undefined
  act(() => lockStore.getState().close())
  phoneStore.setState({ stack: [] })
  persistence?.stop()
  registerStorage(null, null)
  db.close()
  await db.delete()
})

describe('encryption', () => {
  it('uses a strong key derivation by default', () => {
    expect(LOCK_ITERATIONS).toBeGreaterThanOrEqual(600_000)
  })

  it('opens with the right password only', async () => {
    const lock = await newLockKey(PASSWORD, 'n1')
    const locked = await seal(lock, SECRET)
    expect((await unseal(PASSWORD, locked)).text).toBe(SECRET)
    await expect(unseal('wrong password', locked)).rejects.toBeInstanceOf(WrongPasswordError)
  })

  it('never contains the text, and differs every time', async () => {
    const lock = await newLockKey(PASSWORD, 'n1')
    const a = await seal(lock, SECRET)
    const b = await seal(lock, SECRET)
    expect(JSON.stringify(a)).not.toContain('bank')
    expect(atob(a.data)).not.toContain('bank')
    expect(a.iv).not.toBe(b.iv)
    expect(a.data).not.toBe(b.data)
  })

  it('detects tampering', async () => {
    const locked = await seal(await newLockKey(PASSWORD, 'n1'), SECRET)
    const bytes = Uint8Array.from(atob(locked.data), (c) => c.charCodeAt(0))
    bytes[0] ^= 1
    const altered = { ...locked, data: btoa(String.fromCharCode(...bytes)) }
    await expect(unseal(PASSWORD, altered)).rejects.toBeInstanceOf(WrongPasswordError)
  })

  it('handles long text and every language', async () => {
    const text = 'नमस्ते 🌿 '.repeat(20_000)
    const lock = await newLockKey(PASSWORD, 'n1')
    expect((await unseal(PASSWORD, await seal(lock, text))).text).toBe(text)
  })

  it('rejects damaged or hostile locked data from files', () => {
    const ok = { v: 1, salt: 'AAAA', iv: 'AAAA', data: 'AAAA', iterations: 600_000, origin: 'n1' }
    expect(cleanLocked(ok)).toEqual(ok)
    expect(cleanLocked({ ...ok, iterations: 1e12 })).toBeUndefined()
    expect(cleanLocked({ ...ok, data: '<script>' })).toBeUndefined()
    expect(cleanLocked('nope')).toBeUndefined()
  })
})

describe('locking a note leaves no readable copy', () => {
  it('in memory, storage, versions, search or backups', async () => {
    const { s, id } = setup()
    await persistence.flush()
    await saveVersion(db, id, 'an older secret', 5)
    lockStore.getState().open(id)
    await lockNote(id, PASSWORD)
    act(() => lockStore.getState().close())
    await persistence.flush()

    const note = s().notes[id]
    expect(note.content).toBe('')
    expect(note.title).toBe(LOCKED_TITLE) // not the note's first line
    expect(JSON.stringify(s().notes)).not.toContain('bank')
    expect(JSON.stringify(await db.notes.toArray())).not.toContain('bank')
    expect(await listVersions(db, id)).toEqual([])
    expect(JSON.stringify(Object.values(localStorage))).not.toContain('bank')
    expect(searchNotes(Object.values(s().notes), 'bank')).toEqual([])
    const { text } = backupText(Object.values(s().notes), s().settings, 1, [])
    expect(text).not.toContain('bank')
  })

  it('keeps a title the user chose', async () => {
    const { s, id } = setup({ title: 'Passwords' })
    lockStore.getState().open(id)
    await lockNote(id, PASSWORD)
    act(() => lockStore.getState().close())
    expect(s().notes[id].title).toBe('Passwords')
  })

  it('survives a backup and can still be opened afterwards', async () => {
    const { s, id } = setup()
    lockStore.getState().open(id)
    await lockNote(id, PASSWORD)
    act(() => lockStore.getState().close())
    const restored = parseBackup(backupText(Object.values(s().notes), s().settings, 1, []).text)
    const note = restored.notes.find((n) => n.id === id)!
    expect((await unseal(PASSWORD, note.locked!)).text).toBe(SECRET)
  })

  it('is never treated as an empty note and thrown away', async () => {
    const { s, id } = setup()
    s().newNote({ content: 'keep a tab open' })
    lockStore.getState().open(id)
    await lockNote(id, PASSWORD)
    act(() => lockStore.getState().close())
    act(() => s().renameNote(id, ''))
    act(() => s().closeTab(id))
    await persistence.flush()
    expect(s().notes[id]?.locked).toBeDefined()
    expect(await db.notes.get(id)).toBeDefined()
  })

  it('hides actions that need the text', async () => {
    const { s, id } = setup()
    lockStore.getState().open(id)
    await lockNote(id, PASSWORD)
    act(() => lockStore.getState().close())
    for (const c of ['note.share', 'note.print', 'note.export', 'data.exportDocx', 'note.history'])
      expect(
        commandEnabled(
          COMMANDS.find((x) => x.id === c)!,
          s(),
        ),
        c,
      ).toBe(false)
    expect(s().duplicateNote(id)).toBe(id)
  })
})

describe.each([
  ['laptop', false],
  ['phone', true],
])('using a locked note (%s)', (_, phone) => {
  it('asks for the password, then edits stay encrypted', async () => {
    media = stubMedia({ phone, touch: phone })
    const { s, id } = setup()
    lockStore.getState().open(id)
    await lockNote(id, PASSWORD)
    act(() => lockStore.getState().close())
    const user = userEvent.setup()
    const { container } = render(<App />)
    const field = await screen.findByLabelText('Password')
    expect(container).not.toHaveTextContent('bank')

    await user.type(field, 'not it{Enter}')
    expect(await screen.findByRole('alert')).toHaveTextContent('isn’t right')

    await user.clear(field)
    await user.type(field, `${PASSWORD}{Enter}`)
    await waitFor(() => expect(container).toHaveTextContent(SECRET))

    const before = s().notes[id].locked
    await user.click(container.querySelector('.cm-content')!)
    await user.keyboard(' more')
    await waitFor(() => expect(s().notes[id].locked).not.toEqual(before))
    expect(s().notes[id].content).toBe('')
    expect((await unseal(PASSWORD, s().notes[id].locked!)).text).toContain('more')

    await user.click(screen.getByRole('button', { name: 'Lock now' }))
    expect(await screen.findByLabelText('Password')).toBeInTheDocument()
    expect(container).not.toHaveTextContent('bank')
  })
})

it('removing the lock gives the note back as normal text', async () => {
  const { s, id } = setup()
  lockStore.getState().open(id)
  await lockNote(id, PASSWORD)
  act(() => lockStore.getState().close())
  const user = userEvent.setup()
  render(<App />)
  await user.type(await screen.findByLabelText('Password'), `${PASSWORD}{Enter}`)
  await user.click(await screen.findByRole('button', { name: 'Remove lock' }))
  expect(s().notes[id].content).toBe(SECRET)
  expect(s().notes[id].locked).toBeUndefined()
})

it('the lock dialog insists on a matching password and the warning', async () => {
  const { s, id } = setup()
  const user = userEvent.setup()
  render(<App />)
  act(() => lockStore.getState().open(id))
  const dialog = await screen.findByRole('dialog', { name: 'Lock with password' })
  expect(dialog).toHaveTextContent('gone for good')
  const button = within(dialog).getByRole('button', { name: 'Lock note' })
  await user.type(within(dialog).getByLabelText('Password'), 'short')
  expect(within(dialog).getByText(/at least 8/)).toBeInTheDocument()
  await user.clear(within(dialog).getByLabelText('Password'))
  await user.type(within(dialog).getByLabelText('Password'), PASSWORD)
  await user.type(within(dialog).getByLabelText('Repeat password'), 'different one')
  expect(within(dialog).getByText(/don’t match/)).toBeInTheDocument()
  await user.clear(within(dialog).getByLabelText('Repeat password'))
  await user.type(within(dialog).getByLabelText('Repeat password'), PASSWORD)
  expect(button).toBeDisabled()
  await user.click(within(dialog).getByRole('checkbox'))
  expect(button).toBeEnabled()
  await user.click(button)
  await waitFor(() => expect(s().notes[id].locked).toBeDefined())
  vi.restoreAllMocks()
})
