import AxeBuilder from '@axe-core/playwright'
import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { newNote, openApp, tabs } from './helpers'

// Keep sharing inside the browser (two tabs over BroadcastChannel) — no public PeerJS in CI.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => localStorage.setItem('notepadz:share-transport', 'channel'))
})

async function createShare(page: Page, opts: { password: boolean }) {
  await page.getByRole('button', { name: 'Share note' }).click()
  const dialog = page.getByRole('dialog', { name: /share/i })
  if (!opts.password) await dialog.getByRole('switch', { name: /protect with password/i }).click()
  await dialog.getByRole('button', { name: 'Create link' }).click()
  const link = await dialog.getByRole('textbox', { name: 'Link' }).inputValue()
  const password = opts.password
    ? await dialog.getByRole('textbox', { name: 'Password' }).inputValue()
    : null
  return { dialog, link, password }
}

async function openLink(context: BrowserContext, link: string) {
  const page = await context.newPage()
  await page.goto(link)
  return page
}

test('share with password: open in a second tab, enter password, save', async ({
  page,
  context,
}) => {
  await openApp(page)
  await newNote(page, 'meeting notes\nship the sidebar')
  const { link, password } = await createShare(page, { password: true })
  expect(link).toMatch(/#\/s\/[\w-]{43}\.[0-9a-z]+\.p$/)

  const other = await openLink(context, link)
  await expect(other.getByRole('heading', { name: /password-protected/i })).toBeVisible()
  await expect(other).not.toHaveURL(/#\/s\//) // key removed from the address bar
  await other.getByPlaceholder('Password').fill(password!)
  await other.getByRole('button', { name: 'Open note' }).click()
  await expect(other.getByRole('textbox', { name: 'Shared note' })).toContainText(
    'ship the sidebar',
  )
  await expect(other.locator('[data-banner]')).toContainText(/expires in \d+:\d\d/)

  await other.getByRole('button', { name: 'Save to my notes' }).click()
  await expect(tabs(other).filter({ hasText: 'meeting notes (shared)' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
})

test('wrong password then right password', async ({ page, context }) => {
  await openApp(page)
  await newNote(page, 'secret')
  const { link, password } = await createShare(page, { password: true })
  const other = await openLink(context, link)
  await expect(other.getByText('Wrong password. Try again.')).toHaveCount(0)
  await other.getByPlaceholder('Password').fill('not-the-password')
  await other.getByRole('button', { name: 'Open note' }).click()
  await expect(other.getByText('Wrong password. Try again.')).toBeVisible()
  await other.getByPlaceholder('Password').fill(password!.replace(/-/g, ''))
  await other.getByRole('button', { name: 'Open note' }).click()
  await expect(other.getByRole('textbox', { name: 'Shared note' })).toContainText('secret')
})

test('stop sharing makes the link say stopped', async ({ page, context }) => {
  await openApp(page)
  await newNote(page, 'temporary')
  const { dialog, link } = await createShare(page, { password: false })
  await dialog.getByRole('button', { name: 'Stop sharing' }).click()
  const other = await openLink(context, link)
  await expect(other.getByRole('heading', { name: /stopped sharing/i })).toBeVisible()
})

test('expired link shows expired without connecting', async ({ context }) => {
  const page = await openLink(context, `./#/s/${'A'.repeat(43)}.1.n`)
  await expect(page.getByRole('heading', { name: /has expired/i })).toBeVisible()
})

test('active shares indicator lists the share and its countdown ticks', async ({ page }) => {
  await openApp(page)
  await newNote(page, 'indicator test')
  const { dialog } = await createShare(page, { password: false })
  await dialog.getByRole('button', { name: 'Done' }).click()
  const indicator = page.getByRole('button', { name: /sharing 1 note/i })
  const first = await indicator.textContent()
  await expect(indicator).not.toHaveText(first!, { timeout: 3000 })
  await indicator.click()
  await expect(page.getByRole('dialog', { name: 'Active shares' })).toContainText('indicator test')
})

for (const scheme of ['light', 'dark'] as const) {
  test(`axe: share dialog and share view (${scheme})`, async ({ page, context }) => {
    await page.emulateMedia({ colorScheme: scheme })
    await openApp(page)
    await newNote(page, 'a11y check')
    await page.getByRole('button', { name: 'Share note' }).click()
    const serious = async (p: Page) =>
      (
        await new AxeBuilder({ page: p }).disableRules(['scrollable-region-focusable']).analyze()
      ).violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map(
          (v) =>
            `${v.id}: ${v.nodes
              .map((n) => n.target.join(' '))
              .slice(0, 3)
              .join(' | ')}`,
        )
    expect(await serious(page)).toEqual([])
    const { link } = await (async () => {
      const dialog = page.getByRole('dialog', { name: /share/i })
      await dialog.getByRole('button', { name: 'Create link' }).click()
      return { link: await dialog.getByRole('textbox', { name: 'Link' }).inputValue() }
    })()
    const other = await openLink(context, link)
    await other.emulateMedia({ colorScheme: scheme })
    await expect(other.getByRole('heading', { name: /password-protected/i })).toBeVisible()
    expect(await serious(other)).toEqual([])
  })
}
