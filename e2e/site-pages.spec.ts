import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { PAGES } from '../site/pages'
import { openApp } from './helpers'

test.use({ serviceWorkers: 'allow' })

for (const page_ of PAGES)
  test(`${page_.slug} is readable and leads to the app`, async ({ page }) => {
    const res = await page.goto(`${page_.slug}/`)
    expect(res?.status()).toBe(200)
    await expect(page).toHaveTitle(page_.title)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(page_.h1)
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme })
      const axe = await new AxeBuilder({ page }).analyze()
      expect(axe.violations.map((v) => v.id)).toEqual([])
    }
    await page.getByRole('link', { name: 'Open Blankleaf' }).first().click()
    await expect(page.locator('.cm-editor')).toBeVisible()
  })

test('once the app is installed, landing pages and the sitemap still load', async ({ page }) => {
  await openApp(page)
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true)
  await page.goto('faq/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Frequently asked questions')
  const map = await page.goto('sitemap.xml')
  expect(await map?.text()).toContain('/blankleaf/faq/</loc>')
})

for (const width of [320, 390])
  test(`pages fit a ${width}px phone screen`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    for (const p of PAGES) {
      await page.goto(`${p.slug}/`)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      )
      // One-row header, with breathing room before the heading.
      const bar = (await page.locator('header').boundingBox())!
      const h1 = (await page.getByRole('heading', { level: 1 }).boundingBox())!
      expect(bar.height).toBeLessThanOrEqual(72)
      expect(h1.y - (bar.y + bar.height)).toBeGreaterThanOrEqual(24)
    }
  })
