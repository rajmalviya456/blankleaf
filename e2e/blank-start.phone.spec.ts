import { expect, test } from '@playwright/test'
import { editor, noteBar, openPhoneApp } from './helpers'

test('on a phone, opening the address starts blank and the Library has old notes', async ({
  page,
}) => {
  await openPhoneApp(page)
  await noteBar(page)
    .getByRole('button', { name: /^Open tabs:/ })
    .tap()
  await page
    .getByRole('dialog', { name: 'Open tabs' })
    .getByRole('button', { name: 'New note' })
    .tap()
  await editor(page).tap()
  await page.keyboard.type('note from earlier')
  await page.waitForTimeout(600)
  await openPhoneApp(page)
  await expect(editor(page)).not.toContainText('note from earlier')
  await noteBar(page).getByRole('button', { name: 'Library' }).tap()
  await page
    .getByRole('dialog', { name: 'Library' })
    .getByText(/note from earlier/)
    .first()
    .tap()
  await expect(editor(page)).toContainText('note from earlier')
})
