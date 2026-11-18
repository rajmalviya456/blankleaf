import { expect, test, type Page } from '@playwright/test'
import { openApp } from './helpers'

async function openReplace(page: Page) {
  await openApp(page)
  await page.locator('.cm-content').click()
  await page.keyboard.press('ControlOrMeta+f')
  await page.getByRole('button', { name: 'Toggle replace' }).click()
}

const box = async (page: Page, name: string) =>
  (await page.getByRole('button', { name, exact: true }).boundingBox())!

for (const [device, width] of [
  ['laptop', 1280],
  ['phone', 390],
  ['small phone', 320],
] as const)
  test(`find and replace fields match on a ${device}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 700 })
    await openReplace(page)
    const look = (label: string) =>
      page.getByRole('textbox', { name: label, exact: true }).evaluate((input) => {
        const field = input.closest('.np-find-field')
        if (!field) return null
        const s = getComputedStyle(field)
        const b = field.getBoundingClientRect()
        return {
          left: b.left,
          width: b.width,
          height: b.height,
          background: s.backgroundColor,
          border: s.borderTopWidth,
          radius: s.borderTopLeftRadius,
        }
      })
    await page.getByRole('textbox', { name: 'Find', exact: true }).focus()
    const find = await look('Find')
    const replace = await look('Replace')
    expect(replace).not.toBeNull()
    expect(replace).toEqual(find)

    // Both rows end at the same right edge, and nothing spills out of the panel.
    const close = await box(page, 'Close find')
    const all = await box(page, 'Replace all')
    expect(Math.abs(close.x + close.width - (all.x + all.width))).toBeLessThanOrEqual(1)
    const panel = (await page.locator('.np-find').boundingBox())!
    expect(all.x + all.width).toBeLessThanOrEqual(panel.x + panel.width)
    expect(panel.x + panel.width).toBeLessThanOrEqual(width)
    expect(panel.x).toBeGreaterThanOrEqual(0)
  })

test('the Replace field shows focus the same way as Find', async ({ page }) => {
  await openReplace(page)
  const ring = () =>
    page.locator('.np-find-field:focus-within').evaluate((f) => getComputedStyle(f).boxShadow)
  await page.getByRole('textbox', { name: 'Find', exact: true }).focus()
  const find = await ring()
  await page.getByRole('textbox', { name: 'Replace', exact: true }).focus()
  expect(await ring()).toBe(find)
})
