import { expect, test } from '@playwright/test'
import { editor, noteBar, openPhoneApp } from './helpers'

test('lock and unlock a note on a phone', async ({ page }) => {
  await openPhoneApp(page)
  await editor(page).tap()
  // The whole note is just this line, so it's on screen whatever the tap or scroll position
  // (the editor only draws the lines in view).
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.type('phone secret ')
  await noteBar(page).getByRole('button', { name: 'Note menu' }).tap()
  await page
    .getByRole('dialog', { name: 'Note menu' })
    .getByRole('button', { name: 'Lock with password…' })
    .tap()
  const sheet = page.getByRole('dialog', { name: 'Lock with password' })
  await expect(sheet).toHaveAttribute('data-surface', 'sheet')
  await sheet.getByLabel('Password', { exact: true }).fill('correct horse')
  await sheet.getByLabel('Repeat password').fill('correct horse')
  await sheet.getByRole('checkbox').tap()
  await sheet.getByRole('button', { name: 'Lock note' }).tap()
  await expect(sheet).toBeHidden({ timeout: 15_000 })
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
  await expect(page.getByRole('toolbar', { name: 'Editor toolbar' })).toBeHidden()
  await page.getByLabel('Password', { exact: true }).fill('correct horse')
  await page.getByRole('button', { name: 'Unlock' }).tap()
  await expect(editor(page)).toContainText('phone secret')
})
