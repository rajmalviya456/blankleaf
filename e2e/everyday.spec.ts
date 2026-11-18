import { expect, test } from '@playwright/test'
import { editor, newNote, openApp, statusBar } from './helpers'

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    window.print = () => {
      ;(window as unknown as { printed: number }).printed =
        ((window as unknown as { printed?: number }).printed ?? 0) + 1
    }
  })
})

test('prints only the note, in dark mode too, on white', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await openApp(page)
  await newNote(page, 'line one\n  keeps its indent')
  await page.getByRole('button', { name: 'Print or save as PDF' }).click()
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { printed?: number }).printed))
    .toBe(1)
  await page.emulateMedia({ media: 'print', colorScheme: 'dark' })
  await expect(page.locator('#print-root pre')).toHaveText('line one\n  keeps its indent')
  await expect(page.locator('#root')).toBeHidden()
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(bg).toBe('rgb(255, 255, 255)')
  // Native controls such as checkboxes must print light too.
  const scheme = await page.evaluate(
    () => getComputedStyle(document.getElementById('print-root')!).colorScheme,
  )
  expect(scheme).toBe('light')
  const pdf = await page.pdf()
  expect(pdf.length).toBeGreaterThan(1000)
})

test('a template opens ready to fill in', async ({ page }) => {
  await openApp(page)
  await page.getByRole('button', { name: 'New from template' }).click()
  await page.getByRole('menuitem', { name: 'Meeting notes' }).click()
  await expect(editor(page)).toContainText('Action items')
  await expect(statusBar(page).getByRole('radio', { name: 'Preview' })).toBeVisible()
})

test('spell check turns on for one note', async ({ page }) => {
  await openApp(page)
  await newNote(page, 'teh')
  await expect(editor(page)).toHaveAttribute('spellcheck', 'false')
  await statusBar(page).getByRole('button', { name: 'Spelling: off' }).click()
  await expect(editor(page)).toHaveAttribute('spellcheck', 'true')
  await page.reload()
  await expect(editor(page)).toHaveAttribute('spellcheck', 'true')
})

test('the notes list sorts by name', async ({ page }) => {
  await openApp(page)
  await newNote(page, 'zebra')
  await newNote(page, 'apple')
  await page
    .getByRole('button', { name: 'Toggle sidebar' })
    .or(page.getByRole('button', { name: /^Notes/ }))
    .first()
    .click()
  await page.getByRole('button', { name: 'Sort notes' }).click()
  await page.getByRole('menuitemradio', { name: 'Name' }).click()
  const rows = page.getByRole('list', { name: 'Notes' }).getByRole('listitem')
  await expect(rows.first()).toContainText('apple')
  await expect(rows.last()).toContainText('zebra')
})
