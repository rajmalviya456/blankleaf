import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { App } from '../../app/App'
import { openDb, type BlankleafDB } from '../../db/db'
import { registerStorage } from '../../store/dataReset'
import { createAppStore, initStore } from '../../store/store'
import { __setLockIterations, LOCK_ITERATIONS } from '../lock/lockCrypto'
import { __forgetBackupKey, getBackupKey, setBackupPassword } from './backupKey'

beforeAll(() => __setLockIterations(1000))
afterAll(() => __setLockIterations(LOCK_ITERATIONS))
let db: BlankleafDB
beforeEach(() => {
  db = openDb(`bpr-${Math.random()}`)
  registerStorage(db, null)
})
afterEach(async () => {
  __forgetBackupKey()
  registerStorage(null, null)
  db.close()
  await db.delete()
})

async function openSettings() {
  const store = initStore(createAppStore())
  store.getState().newNote({ content: 'x' })
  render(<App />)
  act(() => store.getState().setUi({ settingsOpen: true }))
  return within(await screen.findByRole('dialog', { name: 'Settings' }))
}

describe('Settings › Backup password', () => {
  it('says backups aren’t encrypted, and sets a password', async () => {
    const user = userEvent.setup()
    const settings = await openSettings()
    expect(await settings.findByText(/Backups aren’t encrypted/)).toBeInTheDocument()
    await user.click(settings.getByRole('button', { name: 'Set password…' }))
    const d = await screen.findByRole('dialog', { name: 'Protect your backups with a password' })
    await user.type(within(d).getByLabelText('Backup password'), 'pw')
    await user.type(within(d).getByLabelText('Repeat password'), 'pw{Enter}')
    expect(await settings.findByText(/Backups are encrypted/)).toBeInTheDocument()
    expect(await getBackupKey()).not.toBeNull()
  })

  it('removes the password after asking', async () => {
    await setBackupPassword('pw')
    const user = userEvent.setup()
    const settings = await openSettings()
    await user.click(await settings.findByRole('button', { name: 'Remove' }))
    const confirm = await screen.findByRole('alertdialog', { name: 'Stop encrypting backups?' })
    await user.click(within(confirm).getByRole('button', { name: 'Stop encrypting' }))
    await waitFor(async () => expect(await getBackupKey()).toBeNull())
    expect(await settings.findByText(/Backups aren’t encrypted/)).toBeInTheDocument()
  })
})
