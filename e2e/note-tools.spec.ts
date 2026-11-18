import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { editor, newNote, openApp, statusBar, tabs } from './helpers'

test('version history: bring back earlier text, then undo the restore', async ({ page }) => {
  await page.clock.install()
  await openApp(page)
  await newNote(page, 'first draft')
  await expect(statusBar(page)).toContainText('Saved')
  await page.clock.fastForward('06:00')
  await page.keyboard.type(' and more')
  await expect(statusBar(page)).toContainText('Saved')

  await tabs(page).last().click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Version history…' }).click()
  const dialog = page.getByRole('dialog', { name: 'Version history' })
  const older = dialog.getByRole('option').filter({ hasText: /^(?!Now).*first draft$/ })
  await older.click()
  await expect(dialog.getByLabel('Version text')).toHaveText('first draft')

  const axe = await new AxeBuilder({ page }).include('[role="dialog"]').analyze()
  expect(axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual(
    [],
  )

  await dialog.getByRole('button', { name: 'Restore this version' }).click()
  await expect(editor(page)).toHaveText('first draft')
  await page.locator('[data-toaster] button', { hasText: 'Undo' }).click()
  await expect(editor(page)).toHaveText('first draft and more')
})

test('Transform menu formats JSON and reports bad input', async ({ page }) => {
  await openApp(page)
  await newNote(page, '{"a":1}')
  const toolbar = page.getByRole('toolbar', { name: 'Editor toolbar' })
  await toolbar.getByRole('button', { name: 'Transform' }).click()
  await page.getByRole('menuitem', { name: 'Minify JSON' }).click()
  await toolbar.getByRole('button', { name: 'Transform' }).click()
  await page.getByRole('menuitem', { name: 'Base64 decode' }).click()
  await expect(page.locator('[data-toaster]')).toContainText('Not valid Base64')
  await expect(editor(page)).toContainText('{"a":1}')
})

test('checklist boxes tick in the Markdown preview', async ({ page }) => {
  await openApp(page)
  await newNote(page, '- [ ] call mum')
  await statusBar(page)
    .getByRole('button', { name: /^Format:/ })
    .click()
  await page.getByRole('menuitemradio', { name: 'Markdown' }).click()
  await statusBar(page).getByRole('radio', { name: 'Preview' }).click()
  await page.getByRole('checkbox', { name: 'call mum' }).check()
  await statusBar(page).getByRole('radio', { name: 'Edit' }).click()
  await expect(editor(page)).toHaveText('- [x] call mum')
})
