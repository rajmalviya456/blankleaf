import AxeBuilder from '@axe-core/playwright'
import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { newNote, openApp } from './helpers'

// Keep sharing inside the browser (two tabs over BroadcastChannel) — no public PeerJS in CI.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => localStorage.setItem('blankleaf:share-transport', 'channel'))
})

const serious = async (p: Page) =>
  (
    await new AxeBuilder({ page: p }).disableRules(['scrollable-region-focusable']).analyze()
  ).violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)

async function share(page: Page, context: BrowserContext, text: string, password: boolean) {
  await openApp(page)
  await newNote(page, text)
  await page.getByRole('button', { name: 'Share note' }).click()
  const dialog = page.getByRole('dialog', { name: /share/i })
  if (!password) await dialog.getByRole('switch', { name: /protect with password/i }).click()
  await dialog.getByRole('button', { name: 'Create link' }).click()
  const link = await dialog.getByRole('textbox', { name: 'Link' }).inputValue()
  const other = await context.newPage()
  await other.goto(link)
  return other
}

for (const scheme of ['light', 'dark'] as const) {
  test(`the opened note takes focus to its heading and passes axe (${scheme})`, async ({
    page,
    context,
  }) => {
    const other = await share(page, context, 'focus lands here', false)
    await other.emulateMedia({ colorScheme: scheme })
    await expect(other.getByRole('textbox', { name: 'Shared note' })).toContainText(
      'focus lands here',
    )
    await expect(other.getByRole('heading', { level: 1 })).toBeFocused()
    await expect(other.getByRole('status')).toHaveText('Shared note opened')
    expect(await serious(other)).toEqual([])
  })
}

test('a wrong password is read out with the password field, which keeps focus', async ({
  page,
  context,
}) => {
  const other = await share(page, context, 'secret', true)
  const field = other.getByPlaceholder('Password')
  await field.fill('not-the-password')
  await other.getByRole('button', { name: 'Open note' }).click()
  await expect(other.getByRole('alert')).toHaveText('Wrong password. Try again.')
  await expect(field).toHaveAccessibleDescription('Wrong password. Try again.')
  await expect(field).toBeFocused()
})

test('the cut-off link card passes axe', async ({ page }) => {
  await page.goto('./#/s/AAAA')
  const heading = page.getByRole('heading', { name: /incomplete/i })
  await expect(heading).toBeFocused()
  // A place to read from, not a control: no focus ring around the title.
  await expect(heading).toHaveCSS('outline-style', 'none')
  expect(await serious(page)).toEqual([])
})
