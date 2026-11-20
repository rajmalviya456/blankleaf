import { expect, test } from '@playwright/test'
import { newNote, openApp } from './helpers'

test.beforeEach(async ({ context }) => {
  // A real folder handle, from the browser's private file system.
  await context.addInitScript(() => {
    Object.assign(window, {
      showDirectoryPicker: async () =>
        (await navigator.storage.getDirectory()).getDirectoryHandle('Backups', { create: true }),
    })
  })
})

test('keeps an encrypted backup in the chosen folder, and remembers it', async ({ page }) => {
  await openApp(page)
  await newNote(page, 'safe in the folder')
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const settings = page.getByRole('dialog', { name: 'Settings' })
  await settings.getByRole('button', { name: 'Choose folder…' }).click()
  const protect = page.getByRole('dialog', { name: 'Protect your backups with a password' })
  await protect.getByLabel('Backup password').fill('pw')
  await protect.getByLabel('Repeat password').fill('pw')
  await protect.getByRole('button', { name: 'Turn on encrypted backup' }).click()
  await expect(settings).toContainText('Saving to “Backups”, encrypted')

  const read = () =>
    page.evaluate(async () => {
      const root = await navigator.storage.getDirectory()
      const dir = await root.getDirectoryHandle('Backups')
      const file = await dir.getFileHandle('blankleaf-backup-latest.json')
      return (await file.getFile()).text()
    })
  await expect.poll(read).toContain('"encrypted"')
  expect(await read()).not.toContain('safe in the folder')

  await page.reload()
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Settings' })).toContainText('Saving to “Backups”')
})
