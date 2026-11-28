import { expect, type Page } from '@playwright/test'

export async function openApp(page: Page) {
  await page.goto('./')
  await expect(page.locator('.cm-editor')).toBeVisible()
}

export const editor = (page: Page) => page.locator('.cm-content')
export const statusBar = (page: Page) => page.getByRole('contentinfo', { name: 'Status bar' })
export const tabs = (page: Page) =>
  page.getByRole('tablist', { name: 'Open notes' }).getByRole('tab')

export async function newNote(page: Page, text: string) {
  await page.getByRole('button', { name: 'New note' }).first().click()
  await editor(page).click()
  await page.keyboard.type(text)
}

/** Phone layout: the note bar is up and the editor is showing. */
export async function openPhoneApp(page: Page) {
  await page.goto('./')
  await expect(page.getByRole('banner', { name: 'Note bar' })).toBeVisible()
  await expect(page.locator('.cm-editor')).toBeVisible()
}

export const noteBar = (page: Page) => page.getByRole('banner', { name: 'Note bar' })

type Box = { top: number; bottom: number; left: number; right: number }

/** The match the cursor is on and the find widget, as boxes on the page. */
export async function matchAndWidget(page: Page): Promise<{ match: Box; widget: Box }> {
  await expect(page.locator('.cm-searchMatch-selected').first()).toBeVisible()
  return page.evaluate(() => {
    const box = (el: Element) => {
      const r = el.getBoundingClientRect()
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }
    }
    return {
      match: box(document.querySelector('.cm-searchMatch-selected')!),
      widget: box(document.querySelector('.np-find')!),
    }
  })
}

export const overlaps = (a: Box, b: Box) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
