import { expect, test } from '@playwright/test'
import { editor, newNote, openApp, tabs } from './helpers'

test('trash a note and restore it intact', async ({ page }) => {
  await openApp(page)
  await newNote(page, 'keep me safe\nline two')
  await tabs(page).filter({ hasText: 'keep me safe' }).click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Move to Trash' }).click()
  await expect(tabs(page).filter({ hasText: 'keep me safe' })).toHaveCount(0)

  await page
    .getByRole('navigation', { name: 'Sidebar' })
    .getByRole('button', { name: 'Trash' })
    .click()
  await page.getByRole('button', { name: 'Restore keep me safe' }).click()
  await page
    .getByRole('navigation', { name: 'Sidebar' })
    .getByRole('button', { name: 'Notes' })
    .click()
  await page.getByRole('list', { name: 'Notes' }).getByText('keep me safe').click()
  await expect(editor(page)).toContainText('line two')
})
