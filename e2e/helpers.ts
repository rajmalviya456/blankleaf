import { expect, type Page } from '@playwright/test'

export const mod = process.platform === 'darwin' ? 'Meta' : 'Control'

export async function openApp(page: Page) {
  await page.goto('./')
  await expect(page.locator('.cm-editor')).toBeVisible()
}

export const editor = (page: Page) => page.locator('.cm-content')
export const statusBar = (page: Page) => page.getByRole('status', { name: 'Status bar' })
export const tabs = (page: Page) =>
  page.getByRole('tablist', { name: 'Open notes' }).getByRole('tab')

export async function newNote(page: Page, text: string) {
  await page.getByRole('button', { name: 'New note' }).first().click()
  await editor(page).click()
  await page.keyboard.type(text)
}
