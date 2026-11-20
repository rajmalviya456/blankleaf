import { expect, test, type Page } from '@playwright/test'
import { editor, newNote, openApp, statusBar, tabs } from './helpers'

async function preview(page: Page, source: string) {
  await openApp(page)
  await newNote(page, '')
  await page.keyboard.insertText(source)
  await statusBar(page)
    .getByRole('button', { name: /^Format:/ })
    .click()
  await page.getByRole('menuitemradio', { name: 'Markdown' }).click()
  await statusBar(page).getByRole('radio', { name: 'Preview' }).click()
  return page.getByRole('article', { name: 'Markdown preview' })
}

test('draws Mermaid diagrams with readable labels', async ({ page }) => {
  const article = await preview(page, '```mermaid\ngraph TD\n  Start --> Finish\n```')
  const drawing = article.getByRole('img', { name: 'Diagram' })
  await expect(drawing.locator('svg')).toBeVisible({ timeout: 15_000 })
  await expect(drawing).toContainText('Start')
  await expect(drawing).toContainText('Finish')
})

test('a broken diagram explains itself and keeps its code', async ({ page }) => {
  const article = await preview(page, '```mermaid\nnot a diagram at all\n```')
  await expect(article).toContainText('couldn’t be drawn', { timeout: 15_000 })
  await expect(article).toContainText('not a diagram at all')
})

test('diagrams can’t run scripts', async ({ page }) => {
  const article = await preview(
    page,
    '```mermaid\ngraph TD\n  A["<img src=x onerror=window.hacked=1>"] --> B\n  click A "javascript:window.hacked=1"\n```',
  )
  await expect(article.locator('svg, .md-diagram-error').first()).toBeVisible({ timeout: 15_000 })
  expect(
    await page.evaluate(() => (window as unknown as { hacked?: number }).hacked),
  ).toBeUndefined()
  await expect(article.locator('[onerror], a[href^="javascript"]')).toHaveCount(0)
})

test('draws math, and leaves prices alone', async ({ page }) => {
  const article = await preview(page, 'Costs $5 or $10.\n\n$$\nE = mc^2\n$$')
  await expect(article.locator('math')).toBeVisible()
  await expect(article).toContainText('Costs $5 or $10.')
})

test('the diagram library isn’t downloaded until a note needs it', async ({ page }) => {
  const loaded: string[] = []
  page.on('request', (r) => loaded.push(r.url()))
  await openApp(page)
  await newNote(page, 'plain note')
  expect(loaded.filter((u) => u.includes('/assets/diagrams/'))).toEqual([])
  const sw = await (await page.request.get('sw.js')).text()
  expect(sw).not.toContain('assets/diagrams/')
})

test('two notes side by side, both editable', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await openApp(page)
  await newNote(page, 'left note')
  await newNote(page, 'right note')
  await tabs(page).filter({ hasText: 'left note' }).click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Open beside' }).click()
  const side = page.getByRole('region', { name: 'Side note: left note' })
  await expect(side).toContainText('left note')
  await side.locator('.cm-content').click()
  await page.keyboard.press('End')
  await page.keyboard.type(' edited')
  await expect(side.locator('.cm-content')).toContainText('left note edited')
  await expect(editor(page).first()).toContainText('right note')

  await page.setViewportSize({ width: 800, height: 800 })
  await expect(side).toBeHidden()
  await page.setViewportSize({ width: 1280, height: 800 })
  await side.getByRole('button', { name: 'Close side note' }).click()
  await expect(side).toBeHidden()
})

test('text size changes only the note you’re in, and stays after a reload', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await openApp(page)
  await newNote(page, 'left note')
  await newNote(page, 'right note')
  await tabs(page).filter({ hasText: 'left note' }).click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Open beside' }).click()
  const side = page.getByRole('region', { name: 'Side note: left note' })
  const size = (el: ReturnType<Page['locator']>) => el.evaluate((e) => getComputedStyle(e).fontSize)
  const main = page.locator('main .cm-content').first()
  const before = await size(side.locator('.cm-content'))
  await page.getByRole('button', { name: 'Larger text' }).click()
  await page.getByRole('button', { name: 'Larger text' }).click()
  await expect.poll(() => size(main)).not.toBe(before)
  expect(await size(side.locator('.cm-content'))).toBe(before)
  const grown = await size(main)
  await page.reload()
  await expect.poll(() => size(page.locator('main .cm-content').first())).toBe(grown)
})

test('only the note with the cursor shows its highlighted line and is marked as edited', async ({
  page,
}) => {
  await openApp(page)
  await newNote(page, 'left note')
  await newNote(page, 'right note')
  await tabs(page).filter({ hasText: 'left note' }).click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Open beside' }).click()
  const side = page.getByRole('region', { name: 'Side note: left note' })
  const main = page.locator('main .cm-editor').first()
  const lineBg = (scope: ReturnType<typeof page.locator>) =>
    scope
      .locator('.cm-activeLine')
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor)
  const clear = 'rgba(0, 0, 0, 0)'

  await side.locator('.cm-content').click()
  await expect.poll(() => lineBg(main)).toBe(clear)
  await expect.poll(() => lineBg(side)).not.toBe(clear)
  await expect(side).toHaveAttribute('data-editing', 'true')

  await main.locator('.cm-content').click()
  await expect.poll(() => lineBg(side)).toBe(clear)
  await expect.poll(() => lineBg(main)).not.toBe(clear)
  await expect(side).not.toHaveAttribute('data-editing', 'true')
})

test('a diagram can’t contact another site', async ({ page }) => {
  const outside: string[] = []
  await page.route(
    (url) => url.hostname.endsWith('evil.test'),
    (route) => {
      outside.push(route.request().url())
      return route.abort()
    },
  )
  const article = await preview(
    page,
    [
      '```mermaid',
      '%%{init:{"themeCSS":".node rect{fill:url(https://evil.test/a)}","fontFamily":"x;background:url(https://evil.test/b)"}}%%',
      'graph TD',
      '  A@{ img: "https://evil.test/c.png", label: "Start" } --> B',
      '```',
    ].join('\n'),
  )
  await expect(article.locator('svg, .md-diagram-error').first()).toBeVisible({ timeout: 15_000 })
  await page.waitForTimeout(500)
  expect(outside).toEqual([])
})
