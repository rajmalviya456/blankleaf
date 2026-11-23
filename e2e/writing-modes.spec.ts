import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { editor, newNote, openApp, statusBar } from './helpers'

const LONG = Array.from(
  { length: 12 },
  (_, i) => `## Part ${i + 1}\n\n${'Some words in this part. '.repeat(6)}\n`,
).join('\n')

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

async function run(page: Page, title: string) {
  await page.getByRole('button', { name: /^Command palette/ }).click()
  await expect(page.getByRole('combobox', { name: 'Command palette' })).toBeFocused()
  await page.keyboard.type(title)
  await expect(page.getByRole('option', { name: new RegExp(`^${title}`) }).first()).toBeVisible()
  await page.keyboard.press('Enter')
}

test('the outline lists headings, jumps to one, and stays open after a reload', async ({
  page,
}) => {
  await openApp(page)
  await markdownNote(page, LONG)
  await run(page, 'Toggle outline')
  const outline = page.getByRole('navigation', { name: 'Outline' })
  await expect(outline.getByRole('listitem')).toHaveCount(12)
  await outline.getByRole('button', { name: 'Part 11' }).click()
  await expect(editor(page).locator('.cm-line', { hasText: '## Part 11' })).toBeInViewport()
  await expect(outline.getByRole('button', { name: 'Part 11' })).toHaveAttribute(
    'aria-current',
    'location',
  )
  // Typing goes on at the heading.
  await page.keyboard.type('X')
  await expect(editor(page)).toContainText('X## Part 11')
  await page.reload()
  await expect(page.getByRole('navigation', { name: 'Outline' })).toBeVisible()
})

test('typewriter mode keeps the line being typed near the middle', async ({ page }) => {
  await openApp(page)
  await run(page, 'Toggle typewriter mode')
  await newNote(page, '')
  for (let i = 0; i < 40; i++) await page.keyboard.press('Enter')
  await page.keyboard.type('here')
  const scroller = await page.locator('.cm-scroller').first().boundingBox()
  const line = await editor(page).locator('.cm-activeLine').boundingBox()
  const middle = scroller!.y + scroller!.height / 2
  expect(Math.abs(line!.y + line!.height / 2 - middle)).toBeLessThan(40)
})

test('focus mode dims every paragraph but the current one', async ({ page }) => {
  await openApp(page)
  await run(page, 'Toggle focus mode')
  await newNote(page, 'first para\n\nsecond para')
  await expect(editor(page).locator('.cm-line.cm-dim')).toHaveCount(2)
  await expect(editor(page).locator('.cm-line', { hasText: 'second para' })).not.toHaveClass(
    /cm-dim/,
  )
})

for (const scheme of ['light', 'dark'] as const) {
  test(`outline and focus mode pass an accessibility scan (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme })
    await openApp(page)
    await markdownNote(page, LONG)
    await run(page, 'Toggle outline')
    await run(page, 'Toggle focus mode')
    await page
      .getByRole('navigation', { name: 'Outline' })
      .getByRole('button', { name: 'Part 2' })
      .click()
    await expect(editor(page).locator('.cm-line.cm-dim').first()).toBeVisible()
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
