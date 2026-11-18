import { expect, test } from '@playwright/test'
import { editor, newNote, openApp } from './helpers'

const toolbar = 'Editor toolbar'

test('hidden completely where the browser can’t do it', async ({ page, context }) => {
  await context.addInitScript(() => {
    for (const name of ['SpeechRecognition', 'webkitSpeechRecognition'])
      Object.defineProperty(window, name, { configurable: true, value: undefined })
  })
  await openApp(page)
  await expect(page.getByRole('toolbar', { name: toolbar })).toBeVisible()
  await expect(page.getByRole('button', { name: /voice typing/i })).toHaveCount(0)
  await page.keyboard.press('ControlOrMeta+k')
  await page.getByRole('combobox').fill('voice typing')
  await expect(page.getByRole('option', { name: 'Voice typing' })).toHaveCount(0)
})

test('asks first, then types what you say into the note', async ({ page, context }) => {
  await context.addInitScript(() => {
    class Fake {
      onresult: ((e: unknown) => void) | null = null
      onend: (() => void) | null = null
      onerror = null
      start() {
        Object.assign(window, {
          speak: (t: string) =>
            this.onresult?.({
              resultIndex: 0,
              results: [Object.assign([{ transcript: t }], { isFinal: true })],
            }),
        })
      }
      stop() {}
      abort() {}
    }
    Object.defineProperty(window, 'webkitSpeechRecognition', { configurable: true, value: Fake })
    Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: undefined })
  })
  await openApp(page)
  await newNote(page, 'Dear team')
  await page.getByRole('button', { name: 'Start voice typing' }).click()
  const consent = page.getByRole('dialog', { name: 'Turn on voice typing?' })
  await expect(consent).toContainText('speech service')
  await consent.getByRole('button', { name: 'Turn on' }).click()
  await expect(page.getByRole('status', { name: 'Voice typing' })).toContainText('Listening')
  await page.evaluate(() => (window as unknown as { speak(t: string): void }).speak('hello there'))
  await expect(editor(page)).toContainText('Dear team hello there')
  await page
    .getByRole('status', { name: 'Voice typing' })
    .getByRole('button', { name: 'Stop voice typing' })
    .click()
  await expect(page.getByRole('status', { name: 'Voice typing' })).toHaveCount(0)
})
