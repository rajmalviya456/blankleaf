import { expect, test } from '@playwright/test'
import { editor, newNote, openApp, statusBar } from './helpers'

test('⌘/Ctrl+B bolds in a Markdown note instead of toggling the sidebar', async ({ page }) => {
  await openApp(page)
  await newNote(page, '')
  await statusBar(page)
    .getByRole('button', { name: /^Format:/ })
    .click()
  await page.getByRole('menuitemradio', { name: 'Markdown' }).click()
  await expect(page.getByRole('menu')).toHaveCount(0)
  await editor(page).click()
  await page.keyboard.insertText('# Plan\n\nend')
  const lines = editor(page).locator('.cm-line')
  // Marks stay as typed: the editor shows the note's plain Markdown.
  await expect(lines.first()).toHaveText('# Plan')
  await lines.last().click()
  await page.keyboard.press('Shift+Home')
  await page.keyboard.press('ControlOrMeta+b')
  await expect(lines.last()).toHaveText('**end**')
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
  await expect(editor(page)).toHaveText('- [ ] milk- [ ] eggs')
  // Enter on an empty item ends the list.
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  await page.keyboard.type('done')
  await expect(editor(page).locator('.cm-line').nth(1)).toHaveText('- [ ] eggs')
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
