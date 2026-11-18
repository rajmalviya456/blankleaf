import { expect, test } from '@playwright/test'
import { editor, newNote, openApp } from './helpers'

test.use({ serviceWorkers: 'allow' })

test('the app opens offline after the first visit', async ({ page, context }) => {
  await openApp(page)
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload() // now controlled by the service worker
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true)
  await newNote(page, 'written offline-ready')

  await context.setOffline(true)
  await page.reload()
  await expect(page.locator('.cm-editor')).toBeVisible()
  await expect(editor(page)).toContainText('written offline-ready')
})

test('with the service worker running, the sitemap is still the sitemap', async ({ page }) => {
  await openApp(page)
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true)
  const res = await page.goto('sitemap.xml')
  expect(res?.headers()['content-type']).toContain('xml')
  expect(await res?.text()).toContain('<urlset')
})
