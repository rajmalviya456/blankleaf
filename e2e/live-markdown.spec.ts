import { expect, test } from '@playwright/test'
import { editor, newNote, openApp, statusBar } from './helpers'

test('Markdown looks formatted while typing, and the note keeps its Markdown', async ({ page }) => {
  await openApp(page)
  await newNote(page, '')
  await statusBar(page)
    .getByRole('button', { name: /^Format:/ })
    .click()
  await page.getByRole('menuitemradio', { name: 'Markdown' }).click()
  await editor(page).click()
  await page.keyboard.insertText('# Plan\n\n- [ ] milk\n\nend')
  const lines = editor(page).locator('.cm-line')
  await expect(lines.first()).toHaveClass(/cm-md-h1/)
  await expect(lines.first()).toHaveText('Plan')

  // A checkbox toggles the task in the text.
  await editor(page).locator('input.cm-md-check').click()
  await expect(lines.nth(2).locator('input.cm-md-check')).toBeChecked()

  // ⌘/Ctrl+B bolds in a Markdown note (instead of toggling the sidebar).
  await lines.last().click()
  await page.keyboard.press('Shift+Home')
  await page.keyboard.press('ControlOrMeta+b')
  await expect(lines.last()).toHaveText('**end**')
  await lines.first().click()
  await expect(lines.last()).toHaveText('end')
})
