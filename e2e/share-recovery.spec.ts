import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { newNote, openApp, statusBar, tabs } from './helpers'

// Keep sharing inside the browser (two tabs over BroadcastChannel) — no public PeerJS in CI.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => localStorage.setItem('blankleaf:share-transport', 'channel'))
})

/** Whether the notes database exists yet: the share page must not create it. */
const notesWritten = (page: Page) =>
  page.evaluate(async () => (await indexedDB.databases()).some((d) => d.name === 'notepadz'))

test('a cut-off share link says so instead of opening the notepad', async ({ page }) => {
  await page.goto('./#/s/AAAA')
  await expect(page.getByRole('heading', { name: /incomplete/i })).toBeVisible()
  await expect(page).not.toHaveURL(/#\/s\//)
  expect(await notesWritten(page)).toBe(false)
  await page.getByRole('button', { name: 'Go to my notes' }).click()
  await expect(page.locator('.cm-editor')).toBeVisible()
})

test('reloading the share page comes back to it, and writes nothing', async ({ page }) => {
  // A link to a sender who isn't online.
  const exp = Math.ceil(Date.now() / 1000 + 600).toString(36)
  await page.goto(`./#/s/${'A'.repeat(43)}.${exp}.n`)
  const waiting = page.getByRole('heading', { name: /waiting for the sender/i })
  await expect(waiting).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('status')).toHaveText(/waiting for the sender/i)
  // A phone's pull-to-refresh is held back while the share page is up.
  await expect(page.locator('html')).toHaveCSS('overscroll-behavior-y', 'contain')

  await page.reload()
  await expect(waiting).toBeVisible({ timeout: 10_000 })
  await expect(page).not.toHaveURL(/#\/s\//)
  expect(await notesWritten(page)).toBe(false)

  // Done with it: the notepad opens, and a reload stays there.
  await page.getByRole('button', { name: 'Go to my notes' }).click()
  await expect(page.locator('.cm-editor')).toBeVisible()
  await page.reload()
  await expect(page.locator('.cm-editor')).toBeVisible()
})

test('a Markdown note whose preview fails to download is still shown and saved', async ({
  page,
  context,
}) => {
  await openApp(page)
  await newNote(page, '')
  await page.keyboard.insertText('# Plan\n\nship the sidebar')
  await statusBar(page)
    .getByRole('button', { name: /^Format:/ })
    .click()
  await page.getByRole('menuitemradio', { name: 'Markdown' }).click()
  await page.getByRole('button', { name: 'Share note' }).click()
  const dialog = page.getByRole('dialog', { name: /share/i })
  await dialog.getByRole('switch', { name: /protect with password/i }).click()
  await dialog.getByRole('button', { name: 'Create link' }).click()
  const link = await dialog.getByRole('textbox', { name: 'Link' }).inputValue()

  const other = await context.newPage()
  // As when a deploy has deleted the preview's code while the link waited.
  await other.route(/\/assets\/MarkdownPreview-[\w-]+\.js$/, (route) => route.abort())
  await other.goto(link)
  await expect(other.getByText(/couldn’t be shown formatted/i)).toBeVisible()
  await expect(other.getByText('ship the sidebar')).toBeVisible()
  const axe = await new AxeBuilder({ page: other })
    .disableRules(['scrollable-region-focusable'])
    .analyze()
  expect(axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual(
    [],
  )
  await other.getByRole('button', { name: 'Save to my notes' }).click()
  await expect(tabs(other).filter({ hasText: '(shared)' })).toHaveAttribute('aria-selected', 'true')
})
