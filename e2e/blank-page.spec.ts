import { expect, test } from '@playwright/test'
import { newNote, openApp, statusBar } from './helpers'

test('the blank page shows nothing but the page', async ({ page }) => {
  await openApp(page)
  await newNote(page, 'an older note')
  await expect(statusBar(page)).toContainText('Saved')
  await page.goto('./')
  await expect(page.locator('.cm-editor')).toBeVisible()
  await expect(page.getByRole('button', { name: /^Continue/ })).toHaveCount(0)
  await expect(page.getByRole('main').getByRole('link')).toHaveCount(0)
  const html = await (await page.request.get('./')).text()
  expect(html).not.toContain('href="/blankleaf/faq/"')
})

test('word goal and reading time in the status bar', async ({ page }) => {
  await openApp(page)
  await newNote(page, 'one two three four')
  await expect(statusBar(page)).toContainText('1 min read')
  await statusBar(page).getByRole('button', { name: 'Set a word goal' }).click()
  const dialog = page.getByRole('dialog', { name: 'Word goal' })
  await dialog.getByLabel('Target words').fill('4')
  await page.keyboard.press('Enter')
  await expect(
    statusBar(page).getByRole('button', { name: 'Word goal: 4 of 4 words, reached' }),
  ).toBeVisible()
})

for (const width of [1024, 900, 768, 640])
  test(`the status bar fits at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 700 })
    await openApp(page)
    await newNote(page, 'a note with some words in it')
    await page.keyboard.press('ControlOrMeta+a')
    const bar = statusBar(page)
    await expect(bar).toContainText('selected')
    const fits = await bar.evaluate((b) => b.scrollWidth <= b.clientWidth + 1)
    expect(fits).toBe(true)
    const tallest = await bar.evaluate((b) =>
      Math.max(
        ...[...b.querySelectorAll('span, button')].map((e) => e.getBoundingClientRect().height),
      ),
    )
    expect(tallest).toBeLessThanOrEqual(24)
    await expect(bar.getByRole('button', { name: 'Share note' })).toBeVisible()
  })
