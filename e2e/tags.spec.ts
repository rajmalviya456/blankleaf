import { expect, test } from '@playwright/test'
import { newNote, openApp, statusBar } from './helpers'

test('tag notes, filter the list, and keep tags after a reload', async ({ page }) => {
  await openApp(page)
  await newNote(page, 'budget')
  await statusBar(page).getByRole('button', { name: 'Add tags' }).click()
  const dialog = page.getByRole('dialog', { name: 'Tags' })
  await dialog.getByRole('textbox', { name: 'Add a tag' }).fill('work')
  await page.keyboard.press('Enter')
  await dialog.getByRole('button', { name: 'Done' }).click()
  await expect(statusBar(page).getByRole('button', { name: 'Tags: 1' })).toBeVisible()

  await newNote(page, 'holiday')
  await page
    .getByRole('navigation', { name: 'Sidebar' })
    .getByRole('button', { name: 'Notes' })
    .click()
  const list = page.getByRole('list', { name: 'Notes' })
  await page
    .getByRole('group', { name: 'Filter by tag' })
    .getByRole('button', { name: 'work, 1 note' })
    .click()
  await expect(list.getByRole('listitem')).toHaveCount(1)
  await expect(list).toContainText('budget')

  await expect(statusBar(page)).toContainText('Saved')
  await page.reload()
  await expect(page.getByRole('group', { name: 'Filter by tag' })).toContainText('work')
})
