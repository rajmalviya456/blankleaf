import { expect, test, type Page } from '@playwright/test'
import { openApp } from './helpers'

const toolbar = (page: Page) => page.getByRole('toolbar', { name: 'Editor toolbar' })
const overflow = (page: Page) => toolbar(page).evaluate((bar) => bar.scrollWidth - bar.clientWidth)

/** A plain prose note: its toolbar has every group, so it's the widest. */
async function proseNote(page: Page) {
  await page.getByRole('button', { name: 'New note' }).first().click()
  await page.locator('.cm-content').click()
  await page.keyboard.insertText('A few words of plain text')
}

test('the toolbar fits beside the sidebar on a 1280px laptop, Trash in More tools', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await openApp(page)
  await proseNote(page)
  await page.getByRole('button', { name: 'Notes', exact: true }).click()
  await expect.poll(() => overflow(page)).toBeLessThanOrEqual(0)
  await expect(toolbar(page).getByRole('button', { name: 'Move to Trash' })).toHaveCount(0)
  await toolbar(page).getByRole('button', { name: 'More tools' }).click()
  const menu = page.getByRole('menu')
  await expect(menu.getByRole('menuitem', { name: 'Move to Trash' })).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: 'Share via link…' })).toBeVisible()
  // The text size controls still fit, so they stay on the toolbar.
  await page.keyboard.press('Escape')
  await expect(toolbar(page).getByRole('button', { name: 'Larger text' })).toBeVisible()
})

test('a wide window shows every tool, and they come back after the window narrows', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 800 })
  await openApp(page)
  await proseNote(page)
  await expect(toolbar(page).getByRole('button', { name: 'Move to Trash' })).toBeVisible()
  await expect(toolbar(page).getByRole('button', { name: 'More tools' })).toHaveCount(0)
  await page.setViewportSize({ width: 800, height: 800 })
  await expect(toolbar(page).getByRole('button', { name: 'More tools' })).toBeVisible()
  await expect.poll(() => overflow(page)).toBeLessThanOrEqual(0)
  await page.setViewportSize({ width: 1600, height: 800 })
  await expect(toolbar(page).getByRole('button', { name: 'Move to Trash' })).toBeVisible()
  await expect(toolbar(page).getByRole('button', { name: 'More tools' })).toHaveCount(0)
})

for (const width of [1024, 820, 768])
  test(`nothing is cut off at ${width}px (tablets)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await openApp(page)
    await proseNote(page)
    await expect.poll(() => overflow(page)).toBeLessThanOrEqual(0)
  })

test('the largest interface size still fits at 1280px', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await openApp(page)
  await proseNote(page)
  await page.getByRole('button', { name: 'Settings' }).click()
  await page
    .getByRole('radiogroup', { name: 'Interface size' })
    .getByRole('radio', { name: 'XL' })
    .click()
  await page.keyboard.press('Escape')
  await expect.poll(() => overflow(page)).toBeLessThanOrEqual(0)
  // Folded tools still work: the font size steps from the menu.
  const more = toolbar(page).getByRole('button', { name: 'More tools' })
  if (await more.count()) {
    await more.click()
    await expect(page.getByRole('menu').getByRole('menuitem').first()).toBeVisible()
  }
})
