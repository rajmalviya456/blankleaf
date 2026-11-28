import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { openDb, type BlankleafDB } from '../../db/db'
import { DEFAULT_SETTINGS, newNoteDraft } from '../../domain/defaults'
import { __setPbkdf2Iterations, PBKDF2_ITERATIONS } from './crypto'
import { createShareHost } from './host'
import { parseShareHash } from './link'
import { createMemoryTransport } from './memoryTransport'
import { ShareView } from './ShareView'

// The preview's code is a separate download; a deploy can delete it while the recipient waits.
vi.mock('../editor/MarkdownPreview', () => {
  throw new TypeError('Failed to fetch dynamically imported module')
})

beforeAll(() => __setPbkdf2Iterations(1000))
afterAll(() => __setPbkdf2Iterations(PBKDF2_ITERATIONS))

let db: BlankleafDB
beforeEach(() => {
  db = openDb(`preview-fails-${Math.random()}`)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(async () => {
  vi.restoreAllMocks()
  db.close()
  await db.delete()
})

it('a preview that fails to load leaves the note readable, saveable and downloadable', async () => {
  const t = createMemoryTransport()
  const h = createShareHost({ db, transport: t, appUrl: 'https://x.dev/', channel: null })
  onTestFinished(() => h.dispose())
  const content = '# Plan\n\nship the sidebar'
  const created = await h.create(
    { ...newNoteDraft(1, DEFAULT_SETTINGS), title: 'plan', content, mode: 'markdown' },
    { expiresInMs: 300_000, password: null },
  )
  const onSave = vi.fn()
  const onDownload = vi.fn()
  render(
    <ShareView
      parts={parseShareHash(new URL(created.link).hash)!}
      transport={t}
      onSave={onSave}
      onClose={() => {}}
      onDownload={onDownload}
    />,
  )
  expect(await screen.findByText(/couldn’t be shown formatted/i)).toBeInTheDocument()
  expect(screen.getByText(/ship the sidebar/)).toBeInTheDocument()

  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: /save to my notes/i }))
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ content, mode: 'markdown' }))
  await user.click(screen.getByRole('button', { name: /download/i }))
  expect(onDownload).toHaveBeenCalledWith(expect.objectContaining({ text: content }))
  // The source view doesn't need the preview's code.
  await user.click(screen.getByRole('button', { name: /show source/i }))
  expect(await screen.findByRole('textbox', { name: /shared note/i })).toHaveTextContent(
    'ship the sidebar',
  )
})
