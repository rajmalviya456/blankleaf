import { readFile } from 'node:fs/promises'
import { expect, test, type Download, type Page } from '@playwright/test'
import JSZip from 'jszip'
import { editor, newNote, openApp, statusBar, tabs } from './helpers'

const MD = '# Launch\n\n**Ship** it\n\n- [x] done\n\n| a | b |\n|---|---|\n| 1 | 2 |'

async function markdownNote(page: Page) {
  await openApp(page)
  await newNote(page, '')
  await page.keyboard.insertText(MD)
  await statusBar(page)
    .getByRole('button', { name: /^Format:/ })
    .click()
  await page.getByRole('menuitemradio', { name: 'Markdown' }).click()
}

async function pick(page: Page, item: string): Promise<Download> {
  await page.getByRole('button', { name: 'Download note' }).click()
  const wait = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: item }).click()
  return wait
}

test('exports a working web page', async ({ page, context }) => {
  await markdownNote(page)
  const file = await pick(page, 'Web page (.html)')
  expect(file.suggestedFilename()).toBe('Launch.html')
  const html = await readFile(await file.path(), 'utf8')
  const view = await context.newPage()
  await view.setContent(html)
  await expect(view.getByRole('heading', { level: 1 })).toHaveText('Launch')
  await expect(view.getByRole('table')).toBeVisible()
  await expect(view.getByRole('checkbox')).toBeChecked()
})

test('exports a real Word document', async ({ page }) => {
  await markdownNote(page)
  const file = await pick(page, 'Word document (.docx)')
  expect(file.suggestedFilename()).toBe('Launch.docx')
  const zip = await JSZip.loadAsync(await readFile(await file.path()))
  const xml = await zip.file('word/document.xml')!.async('string')
  expect(xml).toContain('w:val="Heading1"')
  expect(xml).toContain('<w:tbl>')
  expect(xml).toContain('☑')
})

test('a backup brings version history back after clearing everything', async ({ page }) => {
  await page.clock.install()
  await openApp(page)
  await newNote(page, 'first draft')
  await expect(statusBar(page)).toContainText('Saved')
  await page.clock.fastForward('06:00')
  await page.keyboard.type(' and more')
  await expect(statusBar(page)).toContainText('Saved')

  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const settings = page.getByRole('dialog', { name: 'Settings' })
  const wait = page.waitForEvent('download')
  await settings.getByRole('button', { name: 'Export…' }).click()
  const protect = page.getByRole('dialog', { name: 'Protect your backups with a password' })
  await protect.getByLabel('Backup password').fill('pw')
  await protect.getByLabel('Repeat password').fill('pw')
  await protect.getByRole('button', { name: 'Save encrypted backup' }).click()
  const file = await (await wait).path()
  await settings.getByRole('textbox', { name: /type delete/i }).fill('delete')
  await settings.getByRole('button', { name: 'Clear all data' }).click()
  await expect(tabs(page)).toHaveText(['Welcome'])

  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  const chooser = page.waitForEvent('filechooser')
  await page
    .getByRole('dialog', { name: 'Settings' })
    .getByRole('button', { name: 'Import…' })
    .click()
  await (await chooser).setFiles(file)
  const importing = page.getByRole('dialog', { name: 'Import backup' })
  await importing.getByLabel('Backup password').fill('pw')
  await importing.getByRole('button', { name: 'Open backup' }).click()
  await importing.getByRole('button', { name: 'Import' }).click()
  await expect(importing).toBeHidden()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeHidden()
  await page
    .getByRole('navigation', { name: 'Sidebar' })
    .getByRole('button', { name: 'Notes' })
    .click()
  await page.getByRole('list', { name: 'Notes' }).getByText('first draft and more').click()
  await expect(editor(page)).toHaveText('first draft and more')
  await tabs(page).filter({ hasText: 'first draft' }).click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Version history…' }).click()
  const history = page.getByRole('dialog', { name: 'Version history' })
  await expect(
    history.getByRole('option').filter({ hasText: /^(?!Now).*first draft$/ }),
  ).toHaveCount(1)
})
