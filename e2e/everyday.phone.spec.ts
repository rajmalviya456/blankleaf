import { expect, test } from '@playwright/test'
import { editor, noteBar, openPhoneApp } from './helpers'

test('a template opens from the tabs sheet', async ({ page }) => {
  await openPhoneApp(page)
  await noteBar(page)
    .getByRole('button', { name: /^Open tabs:/ })
    .tap()
  await page.getByRole('button', { name: 'New from template' }).tap()
  await page.getByRole('menuitem', { name: 'To-do list' }).tap()
  await expect(editor(page)).toContainText('This week')
  await expect(page.getByRole('dialog', { name: 'Open tabs' })).toBeHidden()
})

test('spell check, print and sort are all reachable', async ({ page, context }) => {
  await context.addInitScript(() => {
    window.print = () => document.body.setAttribute('data-printed', 'yes')
  })
  await openPhoneApp(page)
  await noteBar(page).getByRole('button', { name: 'Note menu' }).tap()
  const menu = page.getByRole('dialog', { name: 'Note menu' })
  await menu.getByRole('switch', { name: 'Spell check' }).tap()
  await expect(menu.getByRole('switch', { name: 'Spell check' })).toBeChecked()
  await menu.getByRole('button', { name: 'Print / save as PDF' }).tap()
  await expect(page.locator('body')).toHaveAttribute('data-printed', 'yes')
  await page.reload()
  await noteBar(page).getByRole('button', { name: 'Library' }).tap()
  await page.getByRole('button', { name: 'Sort notes' }).tap()
  await expect(page.getByRole('menuitemradio', { name: 'Name' })).toBeVisible()
})
