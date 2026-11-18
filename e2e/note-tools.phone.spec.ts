import { expect, test, type Page } from '@playwright/test'
import { editor, noteBar, openPhoneApp } from './helpers'

const noteMenu = (page: Page) => page.getByRole('dialog', { name: 'Note menu' })

async function newNote(page: Page, text: string) {
  await noteBar(page)
    .getByRole('button', { name: /^Open tabs:/ })
    .tap()
  await page
    .getByRole('dialog', { name: 'Open tabs' })
    .getByRole('button', { name: 'New note' })
    .tap()
  await editor(page).tap()
  await page.keyboard.type(text)
}

test('version history opens as a sheet, restores, and Back closes it', async ({ page }) => {
  await page.clock.install()
  await openPhoneApp(page)
  await newNote(page, 'first draft')
  await page.waitForTimeout(500)
  await page.clock.fastForward('06:00')
  await page.keyboard.type(' and more')
  await page.waitForTimeout(500)

  const open = async () => {
    await noteBar(page).getByRole('button', { name: 'Note menu' }).tap()
    await noteMenu(page).getByRole('button', { name: 'Version history…' }).tap()
    return page.getByRole('dialog', { name: 'Version history' })
  }
  let sheet = await open()
  await expect(sheet).toHaveAttribute('data-surface', 'sheet')
  await page.goBack()
  await expect(sheet).toBeHidden()

  sheet = await open()
  await sheet
    .getByRole('option')
    .filter({ hasText: /^(?!Now).*first draft$/ })
    .tap()
  await sheet.getByRole('button', { name: 'Restore this version' }).tap()
  await expect(editor(page)).toHaveText('first draft')
})

test('Transform menu works from the phone toolbar', async ({ page }) => {
  await openPhoneApp(page)
  await newNote(page, '{"a":1}')
  await page
    .getByRole('toolbar', { name: 'Editor toolbar' })
    .getByRole('button', { name: 'Transform' })
    .tap()
  await page.getByRole('menuitem', { name: 'Format JSON' }).tap()
  await expect(editor(page)).toContainText('"a": 1')
})

test('checklist boxes tick in the phone preview', async ({ page }) => {
  await openPhoneApp(page)
  await newNote(page, '- [ ] call mum')
  await noteBar(page).getByRole('button', { name: 'Note menu' }).tap()
  await noteMenu(page)
    .getByRole('button', { name: /^Format:/ })
    .tap()
  const format = page.getByRole('dialog', { name: 'Format' })
  await format.getByRole('searchbox', { name: 'Find a format' }).fill('markdown')
  await format.getByRole('button', { name: /^Markdown/ }).tap()
  await noteBar(page).getByRole('button', { name: 'Preview' }).tap()
  await page.getByRole('checkbox', { name: 'call mum' }).tap()
  await expect(page.getByRole('checkbox', { name: 'call mum' })).toBeChecked()
})
