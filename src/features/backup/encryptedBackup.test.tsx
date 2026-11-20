import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../../app/App'
import { openDb, type BlankleafDB } from '../../db/db'
import { registerStorage } from '../../store/dataReset'
import { createAppStore, initStore } from '../../store/store'
import { toastStore } from '../../ui/toast'
import { __setLockIterations, LOCK_ITERATIONS } from '../lock/lockCrypto'
import { exportAll, importFileList } from './actions'
import { decryptBackup, isEncryptedBackup } from './backupCrypto'
import { __forgetBackupKey, backupKeyStore, getBackupKey, setBackupPassword } from './backupKey'
import { backupPasswordStore } from './backupPasswordStore'
import { importStore } from './importStore'

const PASSWORD = 'correct horse'
beforeAll(() => __setLockIterations(1000))
afterAll(() => __setLockIterations(LOCK_ITERATIONS))

let db: BlankleafDB
let saved: { name: string; text: () => Promise<string> }[]
beforeEach(() => {
  db = openDb(`enc-${Math.random()}`)
  registerStorage(db, null)
  saved = []
  URL.createObjectURL = vi.fn((b: Blob) => {
    saved.push({ name: '', text: () => b.text() })
    return 'blob:x'
  }) as typeof URL.createObjectURL
  URL.revokeObjectURL = vi.fn()
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    saved[saved.length - 1].name = this.download
  })
})
afterEach(async () => {
  vi.restoreAllMocks()
  act(() => {
    importStore.getState().close()
    backupPasswordStore.getState().answer('cancel')
    toastStore.getState().clear()
  })
  __forgetBackupKey()
  registerStorage(null, null)
  db.close()
  await db.delete()
})

function setup(content = 'my secret plan') {
  const store = initStore(createAppStore())
  const s = () => store.getState()
  const id = s().newNote({ content })
  render(<App />)
  return { s, id, user: userEvent.setup() }
}

const dialog = () => screen.findByRole('dialog', { name: 'Protect your backups with a password' })

describe('exporting a backup', () => {
  it('asks for a backup password the first time, then saves an encrypted file', async () => {
    const { user } = setup()
    void exportAll()
    const d = await dialog()
    expect(d).toHaveTextContent(/can’t be opened without it/)
    await user.type(within(d).getByLabelText('Backup password'), PASSWORD)
    await user.type(within(d).getByLabelText('Repeat password'), PASSWORD)
    await user.click(within(d).getByRole('button', { name: 'Save encrypted backup' }))
    await waitFor(() => expect(saved).toHaveLength(1))
    const text = await saved[0].text()
    expect(saved[0].name).toMatch(/^blankleaf-backup-.*\.json$/)
    expect(isEncryptedBackup(text)).toBe(true)
    expect(text).not.toContain('secret')
    expect(await decryptBackup(text, PASSWORD)).toContain('my secret plan')
    expect(backupKeyStore.getState().hasPassword).toBe(true)
  })

  it('after that, exports straight away, encrypted', async () => {
    setup()
    await act(() => setBackupPassword(PASSWORD))
    await act(() => exportAll())
    expect(isEncryptedBackup(await saved[0].text())).toBe(true)
    expect(screen.queryByRole('dialog', { name: /Protect your backups/ })).toBeNull()
  })

  it('the two passwords must match, and must not be empty', async () => {
    const { user } = setup()
    void exportAll()
    const d = await dialog()
    const save = within(d).getByRole('button', { name: 'Save encrypted backup' })
    expect(save).toBeDisabled()
    await user.type(within(d).getByLabelText('Backup password'), PASSWORD)
    await user.type(within(d).getByLabelText('Repeat password'), 'something else')
    expect(save).toBeDisabled()
    expect(d).toHaveTextContent('The passwords don’t match')
  })

  it('can still save without a password, after a warning', async () => {
    const { user } = setup()
    void exportAll()
    const d = await dialog()
    await user.click(within(d).getByRole('button', { name: 'Save without a password' }))
    await waitFor(() => expect(saved).toHaveLength(1))
    expect(await saved[0].text()).toContain('my secret plan')
    expect(await getBackupKey()).toBeNull()
  })
})

describe('restoring an encrypted backup', () => {
  async function encryptedFile() {
    const { s, id, user } = setup()
    await act(() => setBackupPassword(PASSWORD))
    await act(() => exportAll())
    const text = await saved[0].text()
    return { s, id, user, file: new File([text], 'backup.json', { type: 'application/json' }) }
  }

  it('asks for the password on another device, refuses a wrong one, then imports', async () => {
    const { s, id, user, file } = await encryptedFile()
    // Another device: no key here, and the note isn't here either.
    __forgetBackupKey()
    await db.kv.delete('backupKey')
    act(() => {
      s().trashNote(id)
      s().purgeNote(id)
    })
    await act(() => importFileList([file]))
    const d = await screen.findByRole('dialog', { name: 'Import backup' })
    await user.type(within(d).getByLabelText('Backup password'), 'wrong{Enter}')
    expect(await within(d).findByText('Wrong password. Try again.')).toBeInTheDocument()
    await user.clear(within(d).getByLabelText('Backup password'))
    await user.type(within(d).getByLabelText('Backup password'), `${PASSWORD}{Enter}`)
    expect(await within(d).findByText(/1 new/)).toBeInTheDocument()
  })

  it('opens without asking on the device that made it', async () => {
    const { file } = await encryptedFile()
    await act(() => importFileList([file]))
    const d = await screen.findByRole('dialog', { name: 'Import backup' })
    expect(within(d).queryByLabelText('Backup password')).toBeNull()
    expect(d).toHaveTextContent(/already here|up to date/)
  })
})
