import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { editor, openApp } from './helpers'

// Every dialog and panel, opened the way a person would, scanned for any WCAG 2.2 AA or
// best-practice problem (not only serious ones), in both themes.
const COMMANDS = [
  'About Blankleaf',
  'Change format…',
  'Compare with another note…',
  'Insert symbol or emoji…',
  'Keyboard shortcuts',
  'Lock with password…',
  'Readability…',
  'Search all notes',
  'Set word goal…',
  'Settings',
  'Share note…',
  'Show Trash',
  'Tags…',
  'Version history…',
  'What’s new',
  'Rename note',
]

async function violations(page: Page) {
  // CodeMirror's scroller holds the focusable contenteditable, which axe doesn't count.
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .disableRules(['scrollable-region-focusable'])
    .analyze()
  return results.violations.map(
    (v) =>
      `${v.id}: ${v.nodes
        .map((n) => n.target.join(' '))
        .slice(0, 3)
        .join(' | ')}`,
  )
}

async function openPalette(page: Page) {
  await page.getByRole('button', { name: /^Command palette/ }).click()
  await expect(page.getByRole('combobox', { name: 'Command palette' })).toBeFocused()
}

async function runCommand(page: Page, title: string) {
  await openPalette(page)
  await page.keyboard.type(title)
  await expect(page.getByRole('option', { name: new RegExp(`^${title}`) }).first()).toBeVisible()
  await page.keyboard.press('Enter')
  // Let the dialog's open animation settle before scanning.
  await page.waitForTimeout(400)
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`accessibility of every dialog (${scheme})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme })
      await openApp(page)
    })

    test('main screen', async ({ page }) => {
      expect(await violations(page)).toEqual([])
    })

    for (const title of COMMANDS) {
      test(title, async ({ page }) => {
        await runCommand(page, title)
        expect(await violations(page)).toEqual([])
      })
    }

    test('every emoji category', async ({ page }) => {
      await runCommand(page, 'Insert symbol or emoji…')
      await page.getByRole('tab', { name: 'Emoji', exact: true }).click()
      const categories = page.getByRole('tablist', { name: 'Emoji categories' })
      for (const name of ['Smileys', 'People', 'Food & drink', 'Flags']) {
        await categories.getByRole('tab', { name }).click()
        expect(await violations(page)).toEqual([])
      }
      await categories.getByRole('tab', { name: 'Food & drink' }).click()
      await page.getByRole('button', { name: 'taco', exact: true }).click()
      await expect(editor(page)).toContainText('🌮')
    })

    test('command palette with no matches', async ({ page }) => {
      await openPalette(page)
      await page.keyboard.type('zzzqqq')
      await expect(page.getByText('No results.')).toBeVisible()
      expect(await violations(page)).toEqual([])
    })

    test('Markdown split and preview', async ({ page }) => {
      await editor(page).click()
      await page.keyboard.type('# Plan\n\n- [ ] call mum\n\n| a | b |\n|---|---|\n| 1 | 2 |\n')
      const view = page.getByRole('radiogroup', { name: 'View' })
      for (const mode of ['Split', 'Preview']) {
        await view.getByRole('radio', { name: mode }).click()
        await page.waitForTimeout(400)
        expect(await violations(page)).toEqual([])
      }
    })
  })
}
