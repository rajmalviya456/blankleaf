import { expect, test, type Page } from '@playwright/test'
import { editor, noteBar, openPhoneApp } from './helpers'

const openTabs = (page: Page) =>
  noteBar(page)
    .getByRole('button', { name: /^Open tabs:/ })
    .tap()
const tabsSheet = (page: Page) => page.getByRole('dialog', { name: 'Open tabs' })
const library = (page: Page) => page.getByRole('dialog', { name: 'Library' })
const noteMenu = (page: Page) => page.getByRole('dialog', { name: 'Note menu' })

async function newNote(page: Page, text: string) {
  await openTabs(page)
  await tabsSheet(page).getByRole('button', { name: 'New note' }).tap()
  await editor(page).tap()
  await page.keyboard.type(text)
}

test('write, format and switch tabs on a phone', async ({ page }) => {
  await openPhoneApp(page)
  await newNote(page, 'ship tabs')
  await page.keyboard.press('ControlOrMeta+a')
  await page
    .getByRole('toolbar', { name: 'Editor toolbar' })
    .getByRole('button', { name: 'Bold' })
    .tap()
  await expect(editor(page)).toHaveText('**ship tabs**')
  await openTabs(page)
  await tabsSheet(page)
    .getByRole('button', { name: /^Welcome/ })
    .tap()
  await expect(noteBar(page).getByRole('button', { name: /^Open tabs: Welcome/ })).toBeVisible()
})

test('library: open a note, then trash one with Undo', async ({ page }) => {
  await openPhoneApp(page)
  await newNote(page, 'throwaway note')
  await noteBar(page).getByRole('button', { name: 'Library' }).tap()
  await library(page).getByRole('button', { name: 'Actions for throwaway note' }).tap()
  await page.getByRole('menuitem', { name: 'Move to Trash' }).tap()
  await expect(library(page)).toBeVisible()
  // The toast sits above the (modal) Library, outside its accessibility tree.
  await page.locator('[data-toaster] button', { hasText: 'Undo' }).tap()
  await expect(library(page).getByText('throwaway note')).toBeVisible()
  // Open the restored note from the list: the Library closes on it.
  await library(page).getByText('throwaway note').tap()
  await expect(library(page)).toBeHidden()
  await expect(
    noteBar(page).getByRole('button', { name: 'Open tabs: throwaway note' }),
  ).toBeVisible()
})

test('markdown preview toggle, and Back closes the open sheet only', async ({ page }) => {
  await openPhoneApp(page)
  await newNote(page, '# Heading\n\nbody')
  await noteBar(page).getByRole('button', { name: 'Note menu' }).tap()
  await noteMenu(page)
    .getByRole('button', { name: /^Format:/ })
    .tap()
  const format = page.getByRole('dialog', { name: 'Format' })
  await format.getByRole('searchbox', { name: 'Find a format' }).fill('markdown')
  await format.getByRole('button', { name: /^Markdown/ }).tap()
  await noteBar(page).getByRole('button', { name: 'Preview' }).tap()
  await expect(page.getByRole('article', { name: 'Markdown preview' })).toContainText('Heading')
  const url = page.url()
  await openTabs(page)
  await expect(tabsSheet(page)).toBeVisible()
  await page.goBack()
  await expect(tabsSheet(page)).toBeHidden()
  expect(page.url()).toBe(url)
  await expect(noteBar(page)).toBeVisible()
})

test('share dialog opens as a sheet and creates a link', async ({ page, context }) => {
  await context.addInitScript(() => localStorage.setItem('blankleaf:share-transport', 'channel'))
  await openPhoneApp(page)
  await noteBar(page).getByRole('button', { name: 'Note menu' }).tap()
  await noteMenu(page).getByRole('button', { name: 'Share…' }).tap()
  const dialog = page.getByRole('dialog', { name: /share/i })
  await expect(dialog).toHaveAttribute('data-surface', 'sheet')
  await dialog.getByRole('button', { name: 'Create link' }).tap()
  await expect(dialog.getByRole('textbox', { name: 'Link' })).toHaveValue(/#\/s\//)
})

test('phone text size is separate from the laptop size', async ({ page }) => {
  await openPhoneApp(page)
  await noteBar(page).getByRole('button', { name: 'Library' }).tap()
  await library(page).getByRole('button', { name: 'Settings' }).tap()
  const field = page.getByRole('spinbutton', { name: 'Editor font size in px' })
  await field.fill('20')
  await field.press('Enter')
  await expect(page.locator('.cm-scroller')).toHaveCSS('font-size', '20px')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: /settings/i })).toBeHidden()
  await page.setViewportSize({ width: 1280, height: 800 })
  await expect(page.getByRole('tablist', { name: 'Open notes' })).toBeVisible()
  await expect(page.locator('.cm-scroller')).toHaveCSS('font-size', '14px')
})

test('nothing scrolls sideways at 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 })
  await openPhoneApp(page)
  const wide = () => page.evaluate(() => document.documentElement.scrollWidth)
  expect(await wide()).toBeLessThanOrEqual(360)
  await openTabs(page)
  await expect(tabsSheet(page)).toBeVisible()
  expect(await wide()).toBeLessThanOrEqual(360)
  await page.keyboard.press('Escape')
  await expect(tabsSheet(page)).toBeHidden()
  await noteBar(page).getByRole('button', { name: 'Library' }).tap()
  await expect(library(page)).toBeVisible()
  expect(await wide()).toBeLessThanOrEqual(360)
  await library(page).getByRole('button', { name: 'Close Library' }).tap()
  await noteBar(page).getByRole('button', { name: 'Note menu' }).tap()
  await expect(noteMenu(page)).toBeVisible()
  expect(await wide()).toBeLessThanOrEqual(360)
  await page.keyboard.press('Escape')
  await expect(noteMenu(page)).toBeHidden()
  await noteBar(page).getByRole('button', { name: 'Library' }).tap()
  await library(page).getByRole('button', { name: 'Settings' }).tap()
  await expect(page.getByRole('dialog', { name: /settings/i })).toBeVisible()
  expect(await wide()).toBeLessThanOrEqual(360)
})

test('top bar and toolbar take at most 110px', async ({ page }) => {
  await openPhoneApp(page)
  const bar = await noteBar(page).boundingBox()
  const tools = await page.getByRole('toolbar', { name: 'Editor toolbar' }).boundingBox()
  expect(bar!.height + tools!.height).toBeLessThanOrEqual(110)
})
