import { expect, test } from '@playwright/test'
import { newNote, openApp } from './helpers'

// Typing must never wait for the extras: the preview, spell check, links and the word count all
// catch up when typing pauses. A long task while typing means one of them ran on a keystroke.
test('typing in a big note with every extra on never blocks the page', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await openApp(page)
  for (let i = 0; i < 40; i++) await newNote(page, `Note ${i}\n\nSee [[Note ${(i + 1) % 40}]].`)
  let big = '# Big note\n\n'
  for (let i = 0; big.length < 150_000; i++)
    big += `## Part ${i}\n\nSome words with a typo teh and a link to [[Note ${i % 40}]].\n\n- [ ] item ${i}\n\n`
  await page.getByRole('button', { name: 'New note' }).first().click()
  await page.locator('.cm-content').click()
  // A real paste, the way the clipboard delivers it.
  const pasteStarted = Date.now()
  await page.evaluate((text) => {
    const dt = new DataTransfer()
    dt.setData('text/plain', text)
    document
      .querySelector('.cm-content')!
      .dispatchEvent(
        new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }),
      )
  }, big)
  await expect(page.locator('.cm-content')).toContainText('## Part')
  expect(Date.now() - pasteStarted).toBeLessThan(3000)
  await page.keyboard.press('ControlOrMeta+K')
  await page.getByRole('combobox').fill('Toggle spell check')
  await page.keyboard.press('Enter')
  await page.getByRole('radio', { name: 'Split' }).click()
  await expect(page.locator('.np-misspelled').first()).toBeVisible()
  await expect(page.locator('.md-preview h2').first()).toBeVisible()
  await page.waitForTimeout(1500)

  await page.evaluate(() => {
    const w = window as unknown as { longTasks: number[] }
    w.longTasks = []
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) w.longTasks.push(Math.round(e.duration))
    }).observe({ type: 'longtask' })
  })
  await page
    .locator('.cm-content')
    .first()
    .click({ position: { x: 200, y: 40 } })
  await page.keyboard.type('typing along at a steady pace without stopping', { delay: 40 })
  const longTasks = await page.evaluate(
    () => (window as unknown as { longTasks: number[] }).longTasks,
  )
  expect(longTasks.filter((d) => d > 100)).toEqual([])
})
