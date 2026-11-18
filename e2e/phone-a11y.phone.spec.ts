import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { noteBar, openPhoneApp } from './helpers'

const serious = async (page: Page) =>
  (
    await new AxeBuilder({ page }).disableRules(['scrollable-region-focusable']).analyze()
  ).violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map(
      (v) =>
        `${v.id}: ${v.nodes
          .map((n) => n.target.join(' '))
          .slice(0, 3)
          .join(' | ')}`,
    )

for (const scheme of ['light', 'dark'] as const) {
  test(`no serious axe violations on phone screens (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme })
    await openPhoneApp(page)
    expect(await serious(page)).toEqual([])
    await noteBar(page)
      .getByRole('button', { name: /^Open tabs:/ })
      .tap()
    await expect(page.getByRole('dialog', { name: 'Open tabs' })).toBeVisible()
    expect(await serious(page)).toEqual([])
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Open tabs' })).toBeHidden()
    await noteBar(page).getByRole('button', { name: 'Library' }).tap()
    await expect(page.getByRole('dialog', { name: 'Library' })).toBeVisible()
    expect(await serious(page)).toEqual([])
    await page.getByRole('button', { name: 'Close Library' }).tap()
    await expect(page.getByRole('dialog', { name: 'Library' })).toBeHidden()
    await noteBar(page).getByRole('button', { name: 'Note menu' }).tap()
    await expect(page.getByRole('dialog', { name: 'Note menu' })).toBeVisible()
    expect(await serious(page)).toEqual([])
  })
}
