import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { stubMedia } from '../../../tests/media'
import { App } from '../../app/App'
import { openDb, type BlankleafDB } from '../../db/db'
import { listVersions } from '../../db/versionsRepo'
import { DEFAULT_SETTINGS, newNoteDraft } from '../../domain/defaults'
import { registerStorage } from '../../store/dataReset'
import { createAppStore, initStore } from '../../store/store'
import { applyImport } from '../backup/actions'
import { buildBackup, parseBackup, planImport } from '../backup/backup'
import { tabActionItems } from '../phone/tabActions'
import { phoneStore } from '../phone/phoneStore'
import { tagsStore } from '../tags/tagsStore'
import { __setLockIterations, LOCK_ITERATIONS, newLockKey, seal, unseal } from './lockCrypto'
import { lockNote } from './lockNote'
import { lockStore } from './lockStore'

const PASSWORD = 'correct horse'
beforeAll(() => __setLockIterations(1000))
afterAll(() => __setLockIterations(LOCK_ITERATIONS))

let db: BlankleafDB
let media: ReturnType<typeof stubMedia> | undefined
beforeEach(() => {
  db = openDb(`review-${Math.random()}`)
  registerStorage(db, null)
})
afterEach(async () => {
  media?.restore()
  media = undefined
  act(() => {
    lockStore.getState().close()
    tagsStore.getState().close()
  })
  phoneStore.setState({ stack: [] })
  registerStorage(null, null)
  db.close()
  await db.delete()
})

function setup() {
  const store = initStore(createAppStore())
  const s = () => store.getState()
  return { store, s }
}

async function unlockInApp() {
  const user = userEvent.setup()
  const view = render(<App />)
  await user.type(await screen.findByLabelText('Password'), `${PASSWORD}{Enter}`)
  await screen.findByRole('button', { name: 'Lock now' })
  return { user, ...view }
}

async function lockedNote(content: string) {
  const ctx = setup()
  const id = ctx.s().newNote({ content })
  lockStore.getState().open(id)
  await lockNote(id, PASSWORD)
  act(() => lockStore.getState().close())
  return { ...ctx, id }
}

describe('locked notes open in two windows', () => {
  async function remoteEdit(s: ReturnType<typeof setup>['s'], id: string, text: string) {
    const current = s().notes[id].locked!
    const { lock } = await unseal(PASSWORD, current)
    const sealed = await seal(lock, text)
    await act(async () => s().applyRemoteNote({ ...s().notes[id], locked: sealed, rev: 9 }))
  }

  it('shows the other window’s edit instead of saving over it', async () => {
    const { s, id } = await lockedNote('original')
    const { user, container } = await unlockInApp()
    await remoteEdit(s, id, 'FROM-A')
    await waitFor(() => expect(container.querySelector('.cm-content')).toHaveTextContent('FROM-A'))
    await user.click(container.querySelector('.cm-content')!)
    await user.keyboard('{Control>}{End}{/Control} and B')
    await waitFor(async () =>
      expect((await unseal(PASSWORD, s().notes[id].locked!)).text).toContain('FROM-A'),
    )
  })

  it('keeps unsaved typing as a locked copy when both edit at once', async () => {
    const { s, id } = await lockedNote('original')
    const { user, container } = await unlockInApp()
    await user.click(container.querySelector('.cm-content')!)
    await user.keyboard('LOCAL')
    await remoteEdit(s, id, 'FROM-A')
    const copy = await waitFor(() => {
      const found = Object.values(s().notes).find((n) => n.id !== id && n.locked)
      expect(found).toBeDefined()
      return found!
    })
    expect(copy.title).toContain('conflict copy')
    expect((await unseal(PASSWORD, copy.locked!)).text).toContain('LOCAL')
    expect((await unseal(PASSWORD, s().notes[id].locked!)).text).toBe('FROM-A')
  })
})

describe('locked data', () => {
  it('still opens when copied to a new note (conflict copies)', async () => {
    const locked = await seal(await newLockKey(PASSWORD, 'note-1'), 'text')
    expect(locked.origin).toBe('note-1')
    expect((await unseal(PASSWORD, locked)).text).toBe('text')
    await expect(unseal(PASSWORD, { ...locked, origin: 'other' })).rejects.toThrow()
  })

  it('an older backup can’t bring plain versions back to a locked note', async () => {
    const { s, id } = await lockedNote('secret')
    const old = { ...newNoteDraft(1, DEFAULT_SETTINGS, id), content: 'secret', updatedAt: 1 }
    const backup = parseBackup(
      JSON.stringify(
        buildBackup([old], DEFAULT_SETTINGS, 1, [{ noteId: id, at: 1, content: 'secret' }]),
      ),
    )
    await applyImport(planImport(s().notes, new Set(), backup), false)
    expect(await listVersions(db, id)).toEqual([])
  })

  it('Cancel really cancels locking', async () => {
    const { s } = setup()
    const id = s().newNote({ content: 'stay readable' })
    lockStore.getState().open(id)
    const pending = lockNote(id, PASSWORD)
    lockStore.getState().close()
    await pending
    expect(s().notes[id].locked).toBeUndefined()
    expect(s().notes[id].content).toBe('stay readable')
  })

  it('removing the lock clears the placeholder title', async () => {
    const { s, id } = await lockedNote('Groceries')
    expect(s().notes[id].title).toBe('Locked note')
    act(() => s().removeLock(id, 'Groceries'))
    expect(s().notes[id].title).toBeNull()
  })
})

describe('controls on locked notes', () => {
  it('the status bar has no Share button', async () => {
    await lockedNote('secret')
    render(<App />)
    await screen.findByLabelText('Password')
    expect(screen.queryByRole('button', { name: 'Share note' })).toBeNull()
  })

  it('phone menus offer only what works', async () => {
    media = stubMedia({ phone: true, touch: true })
    const { id } = await lockedNote('# secret')
    expect(tabActionItems(id).map((a) => a.label)).not.toContain('Duplicate')
    render(<App />)
    await screen.findByLabelText('Password')
    expect(screen.queryByRole('button', { name: 'Preview' })).toBeNull()
    act(() => phoneStore.getState().open('menu'))
    const menu = await screen.findByRole('dialog', { name: 'Note menu' })
    expect(within(menu).queryByRole('button', { name: 'Find & replace' })).toBeNull()
  })

  it('spell check applies while unlocked', async () => {
    const { s, id } = await lockedNote('secret')
    act(() => s().toggleSpellcheck(id))
    const { container } = await unlockInApp()
    expect(container.querySelector('.cm-content')).toHaveAttribute('spellcheck', 'true')
  })
})

describe('tags', () => {
  it('Back saves a typed tag to its own note, never the next one', async () => {
    const { s } = setup()
    const a = s().newNote({ title: 'A', content: 'a' })
    const b = s().newNote({ title: 'B', content: 'b' })
    const user = userEvent.setup()
    render(<App />)
    act(() => tagsStore.getState().open(a))
    const first = await screen.findByRole('dialog', { name: 'Tags' })
    await user.type(within(first).getByRole('textbox'), 'leftover')
    act(() => tagsStore.getState().close())
    expect(s().notes[a].tags).toEqual(['leftover'])
    act(() => tagsStore.getState().open(b))
    const second = await screen.findByRole('dialog', { name: 'Tags' })
    expect(within(second).getByRole('textbox')).toHaveValue('')
    await user.click(within(second).getByRole('button', { name: 'Done' }))
    expect(s().notes[b].tags).toBeUndefined()
  })
})

describe('side by side', () => {
  function two() {
    media = stubMedia({ wide: true })
    const { s } = setup()
    const a = s().newNote({ title: 'Side', content: 'side words' })
    const b = s().newNote({ title: 'Main', content: 'main words' })
    act(() => s().setSplitNote(a))
    return { s, a, b }
  }

  it('the toolbar formats the note you’re working in', async () => {
    const { s, a, b } = two()
    render(<App />)
    const side = await screen.findByRole('region', { name: 'Side note: Side' })
    const content = side.querySelector<HTMLElement>('.cm-content')!
    act(() => content.focus())
    fireEvent.focusIn(content)
    await userEvent.keyboard('{Control>}a{/Control}')
    await userEvent.click(screen.getByRole('button', { name: 'Bold' }))
    await waitFor(() => expect(s().notes[a].content).toBe('**side words**'))
    expect(s().notes[b].content).toBe('main words')
  })

  it('closes with its tab and doesn’t come back after a restore', () => {
    const { s, a } = two()
    act(() => s().closeTab(a))
    expect(s().session.splitNoteId).toBeNull()
    act(() => s().setSplitNote(a))
    act(() => s().trashNote(a))
    expect(s().session.splitNoteId).toBeNull()
    act(() => s().restoreNote(a))
    expect(s().session.splitNoteId).toBeNull()
    act(() => s().setSplitNote(a))
    act(() => s().removeRemoteNote(a))
    expect(s().session.splitNoteId).toBeNull()
  })
})
