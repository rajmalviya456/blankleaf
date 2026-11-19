// Retakes the README screenshots in docs/images from a running app.
//   npm run dev -- --port 5173   (in another terminal)
//   node scripts/readme-shots.mjs [http://localhost:5173/]
// Each shot starts in a fresh browser profile, so it shows a first visit plus what it types.
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { chromium } from '@playwright/test'

const BASE = process.argv[2] ?? 'http://localhost:5173/'
const OUT = new URL('../docs/images/', import.meta.url).pathname
const TMP = new URL('../node_modules/.cache/readme-shots/', import.meta.url).pathname
mkdirSync(TMP, { recursive: true })

const browser = await chromium.launch()
const LAPTOP = { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.25 }
const PHONE = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1.15,
  isMobile: true,
  hasTouch: true,
}

async function open(options, scheme = 'light') {
  const context = await browser.newContext({ ...options, colorScheme: scheme })
  const page = await context.newPage()
  await page.goto(BASE)
  await page.locator('.cm-editor').waitFor()
  return { page, context }
}

/** A new note with this text, typed as a paste (so nothing auto-closes). */
async function note(page, text) {
  await page.getByRole('button', { name: 'New note' }).first().click()
  await page.locator('.cm-content').click()
  await page.keyboard.insertText(text)
  await page.waitForTimeout(600)
  // Not part of the picture: the "Detected Markdown" chip.
  const chip = page.getByRole('status', { name: 'Format detected' })
  if (await chip.isVisible()) await chip.getByRole('button', { name: 'Close' }).click()
}

async function palette(page, command) {
  await page.keyboard.press('ControlOrMeta+K')
  await page.getByRole('combobox').fill(command)
  await page.keyboard.press('Enter')
}

// 1. Hero: the first visit, the sample note beside its preview.
{
  const { page, context } = await open(LAPTOP)
  await page.locator('.md-preview svg').first().waitFor()
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${OUT}hero.png` })
  await context.close()
}

// 2. Links between notes: [[links]] in the editor and preview, Open button at the cursor.
{
  const { page, context } = await open(LAPTOP)
  await note(page, 'Press kit\n\nLogo, screenshots and the one-line pitch.')
  await note(page, 'Tester feedback\n\n"Love that it opens straight to a blank page."')
  await note(
    page,
    '# Launch plan\n\n- [x] Finish the sample note\n- [ ] Post on Product Hunt\n- [ ] Reply to every comment\n\nAssets are in [[Press kit]], and what people said is in [[Tester feedback]].\n',
  )
  await page.getByRole('radio', { name: 'Split' }).click()
  // A few characters in: the very edge of the link puts the cursor before it.
  await page
    .locator('.cm-content .np-note-link')
    .first()
    .click({ position: { x: 40, y: 8 } })
  await page.locator('.np-link-tip').waitFor()
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${OUT}links.png` })
  await context.close()
}

// 3. Compare: two drafts side by side, changes marked.
{
  const { page, context } = await open(LAPTOP)
  await note(
    page,
    'Launch post, first draft\n\nBlankleaf is a free online notepad.\nIt opens to a blank page.\nNo sign-up needed.\nNotes are saved in your browser.\n',
  )
  await note(
    page,
    'Launch post\n\nBlankleaf is a free, open-source online notepad.\nIt opens straight to a blank page.\nNo sign-up, no server.\nNotes are saved in your browser.\nIt works offline, too.\n',
  )
  await palette(page, 'Compare with another note')
  await page.getByRole('button', { name: 'Launch post, first draft' }).click()
  await page.locator('.cm-mergeView, .cm-merge-a').first().waitFor()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}compare.png` })
  await context.close()
}

// 4. Zen: only the page.
{
  const { page, context } = await open(LAPTOP)
  await note(
    page,
    'Morning pages\n\nThe best ideas show up when nothing else is on the screen. No tabs, no buttons, no sidebar: just the line you are writing and the one after it.\n\nWrite first. Tidy later.',
  )
  await palette(page, 'Toggle zen mode')
  await page.waitForTimeout(4500) // the "how to leave" hint fades
  await page.screenshot({ path: `${OUT}zen.png` })
  await context.close()
}

// 5. Phone: the sample note rendered, the Library, and the note menu, side by side.
{
  const { page, context } = await open(PHONE)
  await page.getByRole('button', { name: 'Preview' }).tap()
  await page.locator('.md-preview svg').first().waitFor()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${TMP}phone-1.png` })
  await page.getByRole('button', { name: /^Library/ }).tap()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${TMP}phone-2.png` })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: /^Note menu/ }).tap()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${TMP}phone-3.png` })
  await context.close()
  // Three screens in a row on a light grey card, like the other README images.
  execFileSync('magick', [
    ...[1, 2, 3].map((n) => `${TMP}phone-${n}.png`),
    '-bordercolor',
    '#d9dde3',
    '-border',
    '1',
    '-bordercolor',
    '#e9ebef',
    '-border',
    '18',
    '+append',
    '-bordercolor',
    '#e9ebef',
    '-border',
    '18',
    `${OUT}phone.png`,
  ])
}

await browser.close()
rmSync(TMP, { recursive: true, force: true })
console.log('Saved hero, links, compare, zen and phone screenshots to docs/images/')
