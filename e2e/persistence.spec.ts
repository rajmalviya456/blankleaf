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
