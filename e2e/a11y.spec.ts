import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { openApp } from './helpers'

for (const scheme of ['light', 'dark'] as const) {
  test(`no serious axe violations on main screen (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme })
    await openApp(page)
    await page
      .getByRole('navigation', { name: 'Sidebar' })
      .getByRole('button', { name: 'Notes' })
      .click()
    // CodeMirror's scroller holds the focusable contenteditable, which axe doesn't count.
    const results = await new AxeBuilder({ page })
      .disableRules(['scrollable-region-focusable'])
      .analyze()
    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    )
    expect(
      serious.map(
        (v) =>
          `${v.id}: ${v.nodes
            .map((n) => n.target.join(' '))
            .slice(0, 3)
            .join(' | ')}`,
      ),
    ).toEqual([])
  })
}
