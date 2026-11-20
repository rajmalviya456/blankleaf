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

test('the / menu inserts blocks, and Enter carries a checklist on', async ({ page }) => {
  await openApp(page)
  await newNote(page, '')
  await statusBar(page)
    .getByRole('button', { name: /^Format:/ })
    .click()
  await page.getByRole('menuitemradio', { name: 'Markdown' }).click()
  await expect(page.getByRole('menu')).toHaveCount(0)
  await editor(page).click()
  await page.keyboard.type('/check')
  await page.getByRole('option', { name: /Checklist/ }).click()
  await page.keyboard.type('milk')
  await page.keyboard.press('Enter')
  await page.keyboard.type('eggs')
  await expect(editor(page).locator('input.cm-md-check')).toHaveCount(2)
  // Enter on an empty item ends the list.
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  await page.keyboard.type('done')
  await expect(editor(page).locator('input.cm-md-check')).toHaveCount(2)
  await expect(editor(page).locator('.cm-line').last()).toHaveText('done')
})

test('a heading’s section collapses and opens again', async ({ page }) => {
  await openApp(page)
  await newNote(page, '')
  await statusBar(page)
    .getByRole('button', { name: /^Format:/ })
    .click()
  await page.getByRole('menuitemradio', { name: 'Markdown' }).click()
  await expect(page.getByRole('menu')).toHaveCount(0)
  await editor(page).click()
  await page.keyboard.insertText('# One\nhidden text\n# Two\nshown text')
  await expect(editor(page)).toContainText('hidden text')
  // Click the arrow beside the first heading.
  await page.locator('.cm-foldGutter .cm-gutterElement').filter({ hasText: '▾' }).first().click()
  await expect(editor(page)).not.toContainText('hidden text')
  await expect(editor(page)).toContainText('shown text')
  // The … chip opens it again.
  await page.getByRole('button', { name: 'Show collapsed lines' }).click()
  await expect(editor(page)).toContainText('hidden text')
})
