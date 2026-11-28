import { expect, test } from '@playwright/test'
import { editor, matchAndWidget, openApp, overlaps } from './helpers'

test('no match is hidden behind the find widget, even on the first lines', async ({ page }) => {
  // A narrow window: the widget reaches over most of the first two rows of text.
  await page.setViewportSize({ width: 700, height: 700 })
  await openApp(page)
  await editor(page).click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.insertText('needle '.repeat(30).trim())
  await page.keyboard.press('ControlOrMeta+f')
  const find = page.getByRole('textbox', { name: 'Find', exact: true })
  await find.fill('needle')
  for (let i = 0; i < 30; i++) {
    await find.press('Enter')
    const { match, widget } = await matchAndWidget(page)
    expect(overlaps(match, widget), `match ${i + 1} is under the find widget`).toBe(false)
  }
})

test('closing the find widget puts the text back where it was', async ({ page }) => {
  await openApp(page)
  await editor(page).click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.insertText('first line\nsecond line')
  const top = () =>
    page
      .locator('.cm-line')
      .first()
      .evaluate((l) => l.getBoundingClientRect().top)
  const before = await top()
  await page.keyboard.press('ControlOrMeta+f')
  await expect(page.locator('.np-find')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.np-find')).toHaveCount(0)
  await expect.poll(top).toBe(before)
})

test('opening the find widget further down a long note does not move the text', async ({
  page,
}) => {
  await openApp(page)
  await editor(page).click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.insertText(Array.from({ length: 200 }, (_, i) => `line ${i + 1}`).join('\n'))
  // The cursor is at the end, so the view is scrolled well away from the top.
  const lastTop = () =>
    page
      .locator('.cm-line')
      .last()
      .evaluate((l) => Math.round(l.getBoundingClientRect().top))
  const before = await lastTop()
  await page.keyboard.press('ControlOrMeta+f')
  await expect(page.locator('.np-find')).toBeVisible()
  await expect.poll(lastTop).toBe(before)
  await page.keyboard.press('Escape')
  await expect(page.locator('.np-find')).toHaveCount(0)
  await expect.poll(lastTop).toBe(before)
})
