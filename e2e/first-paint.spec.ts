import { expect, test } from '@playwright/test'
import { openApp } from './helpers'

test('the page appears before the app’s code has loaded', async ({ page }) => {
  let release = () => {}
  const held = new Promise<void>((resolve) => (release = resolve))
  await page.route('**/assets/*.js', async (route) => {
    await held
    await route.continue()
  })
  await page.goto('./', { waitUntil: 'commit' })
  const shell = page.locator('#np-shell')
  await expect(shell).toBeVisible()
  await expect(shell).toContainText('Untitled')
  release()
  await expect(page.locator('.cm-editor')).toBeVisible()
  await expect(shell).toHaveCount(0)
})

test('a saved dark theme is used from the very first paint', async ({ page, context }) => {
  await context.addInitScript(() => localStorage.setItem('blankleaf:theme', 'dark'))
  await page.route('**/assets/*.js', (route) => route.abort())
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('./', { waitUntil: 'commit' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('#np-shell')).toHaveCSS('background-color', 'rgb(17, 19, 24)')
})

test('following the system theme stays correct when the system changes', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await openApp(page)
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('blankleaf:theme')))
    .toBe('system')
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.route('**/assets/*.js', (route) => route.abort())
  await page.goto('./', { waitUntil: 'commit' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('startup code leaves out editor features the app doesn’t use', async ({ page }) => {
  const startup: string[] = []
  page.on('response', async (r) => {
    if (r.url().endsWith('.js')) startup.push(await r.text().catch(() => ''))
  })
  await openApp(page)
  const code = startup.join('\n')
  expect(code).not.toContain('cm-completionIcon')
  expect(code).not.toContain('cm-lintRange')
})
