import { expect, test } from '@playwright/test'
import { newNote, openApp, tabs } from './helpers'

test('encrypted export, clear all data, import with the password: every note comes back', async ({
  page,
}) => {
  await openApp(page)
  await newNote(page, 'note one')
  await newNote(page, 'note two')

  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const settings = page.getByRole('dialog', { name: 'Settings' })
  const downloadPromise = page.waitForEvent('download')
  await settings.getByRole('button', { name: 'Export…' }).click()
  const protect = page.getByRole('dialog', { name: 'Protect your backups with a password' })
  await protect.getByLabel('Backup password').fill('tulip river 42')
  await protect.getByLabel('Repeat password').fill('tulip river 42')
  await protect.getByRole('button', { name: 'Save encrypted backup' }).click()
  const download = await downloadPromise
  const { readFileSync } = await import('node:fs')
  const saved = readFileSync(await download.path(), 'utf8')
  expect(saved).toContain('"encrypted"')
  expect(saved).not.toContain('note one')
  expect(download.suggestedFilename()).toMatch(/^blankleaf-backup-\d{4}-\d{2}-\d{2}\.json$/)
  const file = await download.path()

  await settings.getByRole('textbox', { name: /type delete/i }).fill('delete')
  await settings.getByRole('button', { name: 'Clear all data' }).click()
  await expect(tabs(page)).toHaveText(['Welcome'])

  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const chooserPromise = page.waitForEvent('filechooser')
  await page
    .getByRole('dialog', { name: 'Settings' })
    .getByRole('button', { name: 'Import…' })
    .click()
  await (await chooserPromise).setFiles(file)
  const dialog = page.getByRole('dialog', { name: 'Import backup' })
  await dialog.getByLabel('Backup password').fill('wrong')
  await dialog.getByRole('button', { name: 'Open backup' }).click()
  await expect(dialog).toContainText('Wrong password')
  await dialog.getByLabel('Backup password').fill('tulip river 42')
  await dialog.getByRole('button', { name: 'Open backup' }).click()
  await expect(dialog).toContainText('new')
  await dialog.getByRole('button', { name: 'Import' }).click()
  await expect(dialog).toBeHidden()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeHidden()

  await page
    .getByRole('navigation', { name: 'Sidebar' })
    .getByRole('button', { name: 'Notes' })
    .click()
  const list = page.getByRole('list', { name: 'Notes' })
  await expect(list.getByText('note one')).toBeVisible()
  await expect(list.getByText('note two')).toBeVisible()
})
