import { expect, test } from '@playwright/test'
import { editor, newNote, openApp, statusBar } from './helpers'

test('continue the last note from the blank page', async ({ page }) => {
  await openApp(page)
  await newNote(page, 'yesterday’s plan')
  await expect(statusBar(page)).toContainText('Saved')
  await page.goto('./')
  await page.getByRole('button', { name: 'Continue “yesterday’s plan”' }).click()
  await expect(editor(page)).toContainText('yesterday’s plan')
  await expect(page.getByRole('navigation', { name: 'Get started' })).toBeHidden()
})

test('guide pages are linked for visitors and search engines', async ({ page }) => {
  await openApp(page)
  const nav = page.getByRole('navigation', { name: 'Get started' })
  await expect(nav.getByRole('link', { name: 'Features' })).toHaveAttribute(
    'href',
    '/blankleaf/features/',
  )
  const html = await (await page.request.get('./')).text()
  expect(html).toContain('href="/blankleaf/faq/"')
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
