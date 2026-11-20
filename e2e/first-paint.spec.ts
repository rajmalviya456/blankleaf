import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
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

test('startup code leaves out editor features the app doesn’t use', async ({ page, context }) => {
  // A returning visit, which starts on a blank page. The first visit's sample note loads extra
  // language packs for its code blocks on purpose.
  await openApp(page)
  const again = await context.newPage()
  const startup: string[] = []
  again.on('response', async (r) => {
    if (r.url().endsWith('.js')) startup.push(await r.text().catch(() => ''))
  })
  await openApp(again)
  const code = startup.join('\n')
  expect(code).not.toContain('cm-completionIcon')
  expect(code).not.toContain('cm-lintRange')
})

test('the code needed to start stays small', () => {
  // Everything index.html loads before the app can run, compressed as servers send it.
  const html = readFileSync('dist/index.html', 'utf8')
  const files = new Set(
    [...html.matchAll(/(?:src|href)="\/blankleaf\/(assets\/[^"]+\.js)"/g)].map((m) => m[1]),
  )
  const kb = [...files].reduce((n, f) => n + gzipSync(readFileSync(`dist/${f}`)).length, 0) / 1024
  // About 330 KB now. Raise this only on purpose.
  expect(kb).toBeLessThan(360)
  // Libraries come in their own files, so an update doesn't download them again.
  for (const lib of ['react', 'dexie'])
    expect([...files].some((f) => f.includes(`/${lib}-`))).toBe(true)
})

test('a first visit paints the welcome note’s opening at once; a returning one paints a blank page', async ({
  page,
}) => {
  await page.route('**/assets/*.js', (route) => route.abort())
  await page.goto('./')
  const welcome = page.locator('#np-shell .np-shell-welcome')
  await expect(welcome).toBeVisible()
  await expect(welcome).toContainText('# Welcome to Blankleaf')
  await page.evaluate(() => localStorage.setItem('blankleaf:theme', 'system'))
  await page.goto('./')
  await expect(welcome).toBeHidden()
  await expect(page.locator('#np-shell p')).toHaveText('1')
})
