import { expect, test } from '@playwright/test'
import { editor, newNote, openApp, statusBar, tabs } from './helpers'

test('first run shows the Welcome note', async ({ page }) => {
  await openApp(page)
  await expect(tabs(page)).toHaveText(['Welcome'])
})

test('type-then-reload keeps the last keystrokes', async ({ page }) => {
  await openApp(page)
  await newNote(page, 'typed right before reload')
  // No waiting: reload inside the save debounce window.
  await page.reload()
  await expect(editor(page)).toContainText('typed right before reload')
})

test('tabs, active tab and cursor line are restored', async ({ page }) => {
  await openApp(page)
  await newNote(page, 'alpha')
  await newNote(page, 'bravo\nsecond line')
  await newNote(page, 'charlie')
  await tabs(page).filter({ hasText: 'bravo' }).click()
  await editor(page).getByText('second line').click()
  await expect(statusBar(page)).toContainText('Ln 2')
  await page.waitForTimeout(1200) // let the session debounce run
  await page.reload()
  await expect(tabs(page)).toHaveText(['Welcome', 'alpha', 'bravo', 'charlie'])
  await expect(tabs(page).filter({ hasText: 'bravo' })).toHaveAttribute('aria-selected', 'true')
  await expect(statusBar(page)).toContainText('Ln 2')
})

test('opening the address starts on a blank page; old notes stay one click away', async ({
  page,
}) => {
  await openApp(page)
  await newNote(page, 'yesterday’s note')
  await expect(statusBar(page)).toContainText('Saved')

  await page.goto('./')
  await expect(page.locator('.cm-editor')).toBeVisible()
  await expect(tabs(page)).toHaveCount(1)
  await expect(editor(page)).not.toContainText('yesterday’s note')

  await page
    .getByRole('navigation', { name: 'Sidebar' })
    .getByRole('button', { name: 'Notes' })
    .click()
  await page.getByRole('list', { name: 'Notes' }).getByText('yesterday’s note').click()
  await expect(editor(page)).toContainText('yesterday’s note')
})

test('reloading keeps the note you’re working on', async ({ page }) => {
  await openApp(page)
  await newNote(page, 'still typing this')
  await expect(statusBar(page)).toContainText('Saved')
  await page.reload()
  await expect(editor(page)).toContainText('still typing this')
})

test('blank pages that stay empty don’t pile up in the notes list', async ({ page }) => {
  await openApp(page)
  await page.goto('./')
  await page.goto('./')
  await page.goto('./')
  await expect(page.locator('.cm-editor')).toBeVisible()
  await page
    .getByRole('navigation', { name: 'Sidebar' })
    .getByRole('button', { name: 'Notes' })
    .click()
  await expect(page.getByRole('list', { name: 'Notes' }).getByText('Untitled')).toHaveCount(1)
})
