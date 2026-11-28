import { expect, test } from '@playwright/test'
import { newNote, openApp } from './helpers'

const strip = (page: import('@playwright/test').Page) =>
  page.getByRole('tablist', { name: 'Open notes' })

test('tabs cut off at an edge fade out there, so it’s clear there are more', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 700 })
  await openApp(page)
  for (let i = 1; i <= 12; i++) await newNote(page, `A fairly long note title number ${i}`)
  await strip(page).evaluate((el) => (el.scrollLeft = el.scrollWidth))
  await expect(strip(page)).toHaveAttribute('data-fade', 'start')
  await strip(page).evaluate((el) => (el.scrollLeft = 0))
  await expect(strip(page)).toHaveAttribute('data-fade', 'end')
  await strip(page).evaluate((el) => (el.scrollLeft = 200))
  await expect(strip(page)).toHaveAttribute('data-fade', 'both')
  const mask = await strip(page).evaluate((el) => getComputedStyle(el).maskImage)
  expect(mask).toContain('linear-gradient')
})

test('no fade while every tab fits', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 700 })
  await openApp(page)
  await newNote(page, 'Just one')
  await expect(strip(page)).not.toHaveAttribute('data-fade', /.+/)
})
