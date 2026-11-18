import { expect, test } from '@playwright/test'
import { noteBar, openPhoneApp } from './helpers'

test('tags on a phone: add from the note menu, filter in the Library', async ({ page }) => {
  await openPhoneApp(page)
  await noteBar(page).getByRole('button', { name: 'Note menu' }).tap()
  await page.getByRole('dialog', { name: 'Note menu' }).getByRole('button', { name: 'Tags…' }).tap()
  const sheet = page.getByRole('dialog', { name: 'Tags' })
  await expect(sheet).toHaveAttribute('data-surface', 'sheet')
  await sheet.getByRole('textbox', { name: 'Add a tag' }).fill('ideas')
  await sheet.getByRole('button', { name: 'Done' }).tap()
  await expect(sheet).toBeHidden()
  await noteBar(page).getByRole('button', { name: 'Library' }).tap()
  const chip = page.getByRole('button', { name: 'ideas, 1 note' })
  await chip.tap()
  await expect(chip).toHaveAttribute('aria-pressed', 'true')
  const wide = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(wide).toBeLessThanOrEqual(390)
})
