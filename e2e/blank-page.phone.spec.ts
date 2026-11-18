import { expect, test } from '@playwright/test'
import { editor, noteBar, openPhoneApp } from './helpers'

test('on a phone: continue the last note, and set a word goal', async ({ page }) => {
  await openPhoneApp(page)
  await noteBar(page)
    .getByRole('button', { name: /^Open tabs:/ })
    .tap()
  await page
    .getByRole('dialog', { name: 'Open tabs' })
    .getByRole('button', { name: 'New note' })
    .tap()
  await editor(page).tap()
  await page.keyboard.type('phone draft')
  await page.waitForTimeout(600)
  await openPhoneApp(page)
  const nextUp = page.getByRole('button', { name: 'Continue “phone draft”' })
  await expect(nextUp).toBeVisible()
  const box = (await nextUp.boundingBox())!
  expect(box.height).toBeGreaterThanOrEqual(44)
  await nextUp.tap()
  await expect(editor(page)).toContainText('phone draft')

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
