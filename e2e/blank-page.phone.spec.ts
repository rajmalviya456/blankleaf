import { expect, test } from '@playwright/test'
import { noteBar, openPhoneApp } from './helpers'

test('on a phone: set a word goal', async ({ page }) => {
  await openPhoneApp(page)
  await noteBar(page).getByRole('button', { name: 'Note menu' }).tap()
  await page
    .getByRole('dialog', { name: 'Note menu' })
    .getByRole('button', { name: 'Set word goal…' })
    .tap()
  const sheet = page.getByRole('dialog', { name: 'Word goal' })
  await expect(sheet).toHaveAttribute('data-surface', 'sheet')
  await sheet.getByLabel('Target words').fill('100')
  await sheet.getByRole('button', { name: 'Save' }).tap()
  await expect(sheet).toBeHidden()
})
