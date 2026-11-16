import { expect, test } from '@playwright/test'
import { editor, openApp, statusBar } from './helpers'

test('pasting a 10MB log keeps the editor responsive', async ({ page }) => {
  await openApp(page)
  await page.getByRole('button', { name: 'New note' }).first().click()
  await editor(page).click()
  await page.evaluate(() => {
    const line = '2026-11-16 12:00:00 INFO request handled in 12ms path=/api/items\n'
    const text = line.repeat(Math.ceil((10 * 1024 * 1024) / line.length))
    const dt = new DataTransfer()
    dt.setData('text/plain', text)
    document
      .querySelector('.cm-content')!
      .dispatchEvent(
        new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }),
      )
  })
  await expect(statusBar(page)).toContainText('highlighting off', { timeout: 15_000 })

  const started = Date.now()
  await page.keyboard.press('Control+End')
  await page.keyboard.type('Z')
  await expect(editor(page)).toContainText('Z')
  expect(Date.now() - started).toBeLessThan(1500)
})
