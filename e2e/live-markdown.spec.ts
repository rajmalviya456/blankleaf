import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { editor, newNote, openApp, statusBar } from './helpers'

async function markdownNote(page: Page, text: string) {
  await newNote(page, '')
  await statusBar(page)
    .getByRole('button', { name: /^Format:/ })
    .click()
  await page.getByRole('menuitemradio', { name: 'Markdown' }).click()
  await expect(page.getByRole('menu')).toHaveCount(0)
  await editor(page).click()
  await page.keyboard.insertText(text)
}

test('live Markdown is off until switched on, then stays on for every note', async ({ page }) => {
  await openApp(page)
  await markdownNote(page, '# Plan\n\n- [ ] milk\n\nend')
  const lines = editor(page).locator('.cm-line')
  await expect(lines.first()).toHaveText('# Plan')

  await statusBar(page).getByRole('button', { name: 'Live Markdown: off' }).click()
  await expect(lines.first()).toHaveClass(/cm-md-h1/)
  await expect(lines.first()).toHaveText('Plan')
  // A checkbox toggles the task in the text.
  await editor(page).locator('input.cm-md-check').click()
  await expect(lines.nth(2).locator('input.cm-md-check')).toBeChecked()

  // Another Markdown note, and after a reload: still on.
  await markdownNote(page, '## Next')
  await expect(editor(page).locator('.cm-line').first()).toHaveClass(/cm-md-h2/)
  await page.reload()
  await expect(statusBar(page).getByRole('button', { name: 'Live Markdown: on' })).toBeVisible()
  await expect(editor(page).locator('.cm-line').first()).toHaveClass(/cm-md-h2/)
})

test('spell check switched on in one note stays on for every note', async ({ page }) => {
  await openApp(page)
  await newNote(page, 'one')
  await statusBar(page).getByRole('button', { name: 'Spelling: off' }).click()
  await newNote(page, 'two')
  await expect(statusBar(page).getByRole('button', { name: 'Spelling: on' })).toBeVisible()
  await page.reload()
  await expect(statusBar(page).getByRole('button', { name: 'Spelling: on' })).toBeVisible()
})

for (const scheme of ['light', 'dark'] as const) {
  test(`live Markdown passes an accessibility scan (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme })
    await openApp(page)
    await markdownNote(
      page,
      '# Plan\n\n**bold** and [a link](https://example.com)\n\n- [ ] milk\n- [x] eggs\n\n> quote\n\n---\n',
    )
    await statusBar(page).getByRole('button', { name: 'Live Markdown: off' }).click()
    await expect(editor(page).locator('input.cm-md-check')).toHaveCount(2)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
      .disableRules(['scrollable-region-focusable'])
      .analyze()
    expect(
      results.violations.map(
        (v) =>
          `${v.id}: ${v.nodes
            .map((n) => n.target.join(' '))
            .slice(0, 3)
            .join(' | ')}`,
      ),
    ).toEqual([])
  })
}
