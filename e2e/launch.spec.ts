import { expect, test } from '@playwright/test'
import { editor, openApp, tabs } from './helpers'

test.use({ serviceWorkers: 'allow' })

test('the installed app registers for the Share menu and text files', async ({ request }) => {
  const manifest = await (await request.get('manifest.webmanifest')).json()
  expect(manifest.share_target).toEqual({
    action: './',
    method: 'GET',
    params: { title: 'title', text: 'text', url: 'url' },
  })
  const accept = manifest.file_handlers[0].accept
  expect(accept['text/plain']).toContain('.txt')
  expect(accept['text/markdown']).toContain('.md')
})

test('text shared with the installed app opens as a note', async ({ page, context }) => {
  await context.addInitScript(() => {
    const real = window.matchMedia.bind(window)
    window.matchMedia = (q) =>
      q === '(display-mode: standalone)' ? ({ matches: true } as MediaQueryList) : real(q)
  })
  await page.goto('./?title=Soup&text=Add%20more%20salt')
  await expect(editor(page)).toContainText('Add more salt')
  await expect(tabs(page).filter({ hasText: 'Soup' })).toHaveCount(1)
  expect(new URL(page.url()).search).toBe('')
})

test('a link from a website can’t add a note', async ({ page }) => {
  await page.goto('./?title=Spam&text=Buy%20now')
  await expect(page.locator('.cm-editor')).toBeVisible()
  await expect(editor(page)).not.toContainText('Buy now')
  expect(new URL(page.url()).search).toBe('')
})

test('a file opened with the app appears as a note', async ({ page, context }) => {
  await context.addInitScript(() => {
    Object.defineProperty(window, 'launchQueue', {
      configurable: true,
      value: {
        setConsumer: (consumer: (p: unknown) => void) =>
          setTimeout(() =>
            consumer({
              files: [{ getFile: async () => new File(['from a file'], 'ideas.md') }],
            }),
          ),
      },
    })
  })
  await openApp(page)
  await expect(editor(page)).toContainText('from a file')
})

test('a shared link ending in a file name still opens offline', async ({ page, context }) => {
  test.skip(test.info().project.name !== 'chromium')
  await context.addInitScript(() => {
    const real = window.matchMedia.bind(window)
    window.matchMedia = (q) =>
      q === '(display-mode: standalone)' ? ({ matches: true } as MediaQueryList) : real(q)
  })
  await openApp(page)
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true)
  await context.setOffline(true)
  await page.goto('./?url=https%3A%2F%2Fexample.com%2Fphoto.png')
  await expect(editor(page)).toContainText('photo.png')
})
