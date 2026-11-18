import { expect, test } from '@playwright/test'
import { newNote, openApp, tabs } from './helpers'

test('export, clear all data, import: every note comes back', async ({ page }) => {
  await openApp(page)
  await newNote(page, 'note one')
  await newNote(page, 'note two')

  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const settings = page.getByRole('dialog', { name: 'Settings' })
  const downloadPromise = page.waitForEvent('download')
  await settings.getByRole('button', { name: 'Export…' }).click()
  const download = await downloadPromise
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
  await expect(dialog).toContainText('new')
  await dialog.getByRole('button', { name: 'Import' }).click()
  await page.keyboard.press('Escape')

  await page
    .getByRole('navigation', { name: 'Sidebar' })
    .getByRole('button', { name: 'Notes' })
    .click()
  const list = page.getByRole('list', { name: 'Notes' })
  await expect(list.getByText('note one')).toBeVisible()
  await expect(list.getByText('note two')).toBeVisible()
})
