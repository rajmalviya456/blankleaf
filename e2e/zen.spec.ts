import { expect, test } from '@playwright/test'
import { editor, newNote, openApp } from './helpers'

test('zen mode shows just the text: no line numbers or fold arrows off to the side', async ({
  page,
}) => {
  await openApp(page)
  await editor(page).click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.insertText('# Heading\n\nSome words\n\n## Another\n\nMore words')
  // A Markdown note has fold arrows beside its headings.
  await page.keyboard.press('ControlOrMeta+.')
  await expect(page.getByRole('contentinfo', { name: 'Status bar' })).toBeHidden()
  await expect(page.locator('.cm-gutters')).toBeHidden()
  // Out again (the shortcut: Escape is the browser's own while it's full screen).
  await page.keyboard.press('ControlOrMeta+.')
  await expect(page.getByRole('contentinfo', { name: 'Status bar' })).toBeVisible()
  await expect(page.locator('.cm-gutters')).toBeVisible()
})

test('zen mode from the More tools menu keeps the cursor in the note', async ({ page }) => {
  // Narrow enough that zen mode is in the More tools menu.
  await page.setViewportSize({ width: 700, height: 700 })
  await openApp(page)
  // A plain note: its toolbar is the widest, so zen mode is in the More tools menu.
  await newNote(page, 'Some words')
  await page.getByRole('button', { name: 'More tools' }).click()
  await page.getByRole('menuitem', { name: 'Zen mode' }).click()
  await expect(page.getByRole('contentinfo', { name: 'Status bar' })).toBeHidden()
  await expect(page.locator('.cm-content')).toBeFocused()
  await page.keyboard.type('!')
  await expect(page.locator('.cm-content')).toContainText('Some words!')
})
