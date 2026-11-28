import { expect, test, type Locator, type Page } from '@playwright/test'
import { noteBar, openPhoneApp } from './helpers'

/**
 * A finger lands a little off: every control should still be hit 20px above or below its
 * middle, so it has a touch target of at least 44px (WCAG 2.5.5).
 */
async function smallTargets(page: Page, scope: Locator): Promise<string[]> {
  const controls = scope.locator(
    'button:visible, [role="switch"]:visible, [role="radio"]:visible, [role="combobox"]:visible, input:visible',
  )
  const small: string[] = []
  for (const control of await controls.all()) {
    const missed = await control.evaluate((el) => {
      // Mid-screen, clear of the toasts along the bottom.
      el.scrollIntoView({ block: 'center' })
      const r = el.getBoundingClientRect()
      const x = r.left + r.width / 2
      const y = r.top + r.height / 2
      const hits = (dy: number) => {
        const at = document.elementFromPoint(x, y + dy)
        return !!at && (at === el || el.contains(at))
      }
      return hits(-20) && hits(20)
        ? null
        : el.getAttribute('aria-label') || el.textContent?.trim() || el.tagName
    })
    if (missed) small.push(missed)
  }
  return small
}

test('Settings controls are big enough to tap', async ({ page }) => {
  await openPhoneApp(page)
  await noteBar(page).getByRole('button', { name: 'Library' }).tap()
  await page
    .getByRole('dialog', { name: 'Library' })
    .getByRole('button', { name: 'Settings' })
    .tap()
  const settings = page.getByRole('dialog', { name: /settings/i })
  await expect(settings).toBeVisible()
  expect(await smallTargets(page, settings)).toEqual([])
})

test('the sample note offer is big enough to tap', async ({ page }) => {
  await openPhoneApp(page)
  // A new, empty note shows the offer.
  await noteBar(page)
    .getByRole('button', { name: /^Open tabs:/ })
    .tap()
  await page
    .getByRole('dialog', { name: 'Open tabs' })
    .getByRole('button', { name: 'New note' })
    .tap()
  const offer = page.getByRole('button', { name: 'Try a sample note' })
  await expect(offer).toBeVisible()
  expect(await smallTargets(page, offer.locator('..'))).toEqual([])
})
