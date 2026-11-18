import { expect, test } from '@playwright/test'
import { noteBar, openPhoneApp } from './helpers'

test('exports a Word document from the phone menu', async ({ page }) => {
  await openPhoneApp(page)
  await noteBar(page).getByRole('button', { name: 'Note menu' }).tap()
  const wait = page.waitForEvent('download')
  await page
    .getByRole('dialog', { name: 'Note menu' })
    .getByRole('button', { name: 'Export as Word' })
    .tap()
  expect((await wait).suggestedFilename()).toMatch(/\.docx$/)
})
