import { expect, test } from '@playwright/test'
import { matchAndWidget, openPhoneApp, overlaps } from './helpers'

test('a match on the first line shows below the find widget', async ({ page }) => {
  await openPhoneApp(page)
  await page.locator('.cm-content').click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.insertText('needle on the first line\nand more text below')
  await page.keyboard.press('ControlOrMeta+f')
  const find = page.getByRole('textbox', { name: 'Find', exact: true })
  await find.fill('needle')
  await find.press('Enter')
  const { match, widget } = await matchAndWidget(page)
  expect(overlaps(match, widget)).toBe(false)
  expect(match.top).toBeGreaterThanOrEqual(widget.bottom)
})

test('jumping back to a match further up keeps it clear of the find widget', async ({ page }) => {
  await openPhoneApp(page)
  await page.locator('.cm-content').click()
  const lines = Array.from({ length: 200 }, (_, i) => (i === 99 ? 'needle here' : `line ${i + 1}`))
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.insertText(lines.join('\n'))
  await page.keyboard.press('ControlOrMeta+f')
  const find = page.getByRole('textbox', { name: 'Find', exact: true })
  await find.fill('needle')
  // From the end of the note, the previous match is far above: it scrolls in at the top.
  await find.press('Shift+Enter')
  const { match, widget } = await matchAndWidget(page)
  expect(overlaps(match, widget)).toBe(false)
})
