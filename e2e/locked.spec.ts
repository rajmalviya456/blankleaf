import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { editor, newNote, openApp, statusBar, tabs } from './helpers'

const SECRET = 'launch code 7741'
const PASSWORD = 'correct horse battery'

async function lock(page: Page) {
  await tabs(page).last().click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Lock with password…' }).click()
  const dialog = page.getByRole('dialog', { name: 'Lock with password' })
  await expect(dialog).toBeVisible()
  const axe = await new AxeBuilder({ page }).include('[role="dialog"]').analyze()
  expect(axe.violations.map((v) => v.id)).toEqual([])
  await dialog.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await dialog.getByLabel('Repeat password').fill(PASSWORD)
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Lock note' }).click()
  await expect(dialog).toBeHidden()
}

/** Everything the browser has stored for the app, as text. */
const storedEverywhere = (page: Page) =>
  page.evaluate(async () => {
    const out: unknown[] = [{ ...localStorage }]
    for (const info of await indexedDB.databases()) {
      const db = await new Promise<IDBDatabase>((ok, no) => {
        const r = indexedDB.open(info.name!)
        r.onsuccess = () => ok(r.result)
        r.onerror = () => no(r.error)
      })
      for (const name of db.objectStoreNames) {
        const rows = await new Promise((ok) => {
          const r = db.transaction(name).objectStore(name).getAll()
          r.onsuccess = () => ok(r.result)
        })
        out.push(rows)
      }
      db.close()
    }
    return JSON.stringify(out)
  })

test('a locked note is encrypted at rest and opens only with its password', async ({
  page,
  context,
}) => {
  await page.clock.install()
  await openApp(page)
  await newNote(page, SECRET)
  await expect(statusBar(page)).toContainText('Saved')
  await page.clock.fastForward('06:00')
  await page.keyboard.type(' extra')
  await expect(statusBar(page)).toContainText('Saved')
  expect(await storedEverywhere(page)).toContain('launch code')

  await lock(page)
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
  await expect(page.getByRole('toolbar', { name: 'Editor toolbar' })).toBeHidden()
  await expect(statusBar(page)).toContainText('Saved')
  await expect.poll(() => storedEverywhere(page)).not.toContain('launch code')

  // A later visit, without the fake clock: the locked note waits in the notes list.
  const later = await context.newPage()
  await later.goto('./')
  await later
    .getByRole('navigation', { name: 'Sidebar' })
    .getByRole('button', { name: 'Notes' })
    .click()
  await later.getByRole('list', { name: 'Notes' }).getByText('Locked note').click()
  await later.getByLabel('Password', { exact: true }).fill('wrong password')
  await later.keyboard.press('Enter')
  await expect(later.getByRole('alert')).toContainText('isn’t right')
  await later.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await later.keyboard.press('Enter')
  await expect(editor(later)).toContainText(SECRET)

  await editor(later).click()
  await later.keyboard.press('ControlOrMeta+End')
  await later.keyboard.type(' zebrafish')
  await expect(statusBar(later)).toContainText('Saved')
  await later.waitForTimeout(700)
  await later.getByRole('button', { name: 'Lock now' }).click()
  await expect.poll(() => storedEverywhere(later)).not.toContain('zebrafish')

  await later.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await later.keyboard.press('Enter')
  await expect(editor(later)).toContainText('zebrafish')
})

test('switching tabs locks the note again', async ({ page }) => {
  await openApp(page)
  await newNote(page, SECRET)
  await lock(page)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.keyboard.press('Enter')
  await expect(editor(page)).toContainText(SECRET)
  await tabs(page).first().click()
  await tabs(page).last().click()
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
  await expect(page.getByText(SECRET)).toBeHidden()
})
