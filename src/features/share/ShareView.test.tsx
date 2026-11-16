import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { openDb, type NotepadzDB } from '../../db/db'
import { DEFAULT_SETTINGS, newNoteDraft } from '../../domain/defaults'
import type { Note } from '../../domain/types'
import { __setPbkdf2Iterations, PBKDF2_ITERATIONS } from './crypto'
import { createShareHost, type ShareHost } from './host'
import { parseShareHash } from './link'
import { createMemoryTransport } from './memoryTransport'
import { ShareView } from './ShareView'
import type { ShareTransport } from './transport'

beforeAll(() => __setPbkdf2Iterations(1000))
afterAll(() => __setPbkdf2Iterations(PBKDF2_ITERATIONS))

let db: NotepadzDB
const cleanups: (() => void)[] = []
beforeEach(() => {
  db = openDb(`view-${Math.random()}`)
})
afterEach(async () => {
  cleanups.splice(0).forEach((f) => f())
  vi.useRealTimers()
  db.close()
  await db.delete()
})

const note = (patch: Partial<Note> = {}): Note => ({
  ...newNoteDraft(1, DEFAULT_SETTINGS),
  title: 'api-fix.js',
  content: 'const retry = 3',
  language: 'javascript',
  ...patch,
})

function host(t: ShareTransport): ShareHost {
  const h = createShareHost({ db, transport: t, appUrl: 'https://x.dev/notepadz/', channel: null })
  cleanups.push(() => h.dispose())
  return h
}

function view(t: ShareTransport, link: string) {
  const onSave = vi.fn()
  const onClose = vi.fn()
  const onDownload = vi.fn()
  const parts = parseShareHash(new URL(link).hash)!
  const utils = render(
    <ShareView
      parts={parts}
      transport={t}
      onSave={onSave}
      onClose={onClose}
      onDownload={onDownload}
    />,
  )
  cleanups.push(() => utils.unmount())
  return { onSave, onClose, onDownload, user: userEvent.setup() }
}

describe('ShareView', () => {
  it('opening a share link creates no notes', async () => {
    const t = createMemoryTransport()
    const created = await host(t).create(note(), { expiresInMs: 300_000, password: null })
    view(t, created.link)
    expect(await screen.findByRole('textbox', { name: /shared note/i })).toBeInTheDocument()
    const names = (await indexedDB.databases()).map((d) => d.name)
    expect(names).not.toContain('notepadz')
  })

  it('password flow to a read-only note', async () => {
    const t = createMemoryTransport()
    const created = await host(t).create(note(), {
      expiresInMs: 300_000,
      password: 'kq7m-x3vr-p9tz',
    })
    const { user } = view(t, created.link)
    expect(screen.queryByText(/wrong password/i)).toBeNull()
    await user.type(screen.getByLabelText(/^password$/i), 'nope-nope-nope{Enter}')
    expect(await screen.findByText('Wrong password. Try again.')).toBeInTheDocument()
    const field = screen.getByLabelText(/^password$/i)
    await user.clear(field)
    await user.type(field, 'kq7mx3vrp9tz{Enter}')
    const editor = await screen.findByRole('textbox', { name: /shared note/i })
    expect(editor).toHaveTextContent('const retry = 3')
    expect(editor).toHaveAttribute('contenteditable', 'false')
    expect(document.querySelector('[data-banner]')).toHaveTextContent(/expires in \d+:\d\d/)
  })

  it('save hands over a copy titled "<title> (shared)" in the same format', async () => {
    const t = createMemoryTransport()
    const created = await host(t).create(note(), { expiresInMs: 300_000, password: null })
    const { onSave, user } = view(t, created.link)
    await user.click(await screen.findByRole('button', { name: /save to my notes/i }))
    expect(onSave).toHaveBeenCalledWith({
      title: 'api-fix.js (shared)',
      content: 'const retry = 3',
      language: 'javascript',
      mode: 'plain',
    })
  })

  it('untitled notes are saved under their first line', async () => {
    const t = createMemoryTransport()
    const created = await host(t).create(note({ title: null, content: 'Grocery list\nmilk' }), {
      expiresInMs: 300_000,
      password: null,
    })
    const { onSave, user } = view(t, created.link)
    await user.click(await screen.findByRole('button', { name: /save to my notes/i }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: 'Grocery list (shared)' }))
  })

  it('download exports with the format extension', async () => {
    const t = createMemoryTransport()
    const created = await host(t).create(note(), { expiresInMs: 300_000, password: null })
    const { onDownload, user } = view(t, created.link)
    await user.click(await screen.findByRole('button', { name: /download/i }))
    expect(onDownload).toHaveBeenCalledWith(expect.objectContaining({ name: 'api-fix.js.js' }))
  })

  it('expired link shows the expired screen', () => {
    const link = `https://x.dev/notepadz/#/s/${'A'.repeat(43)}.1.n`
    view(createMemoryTransport(), link)
    expect(
      screen.getByRole('heading', { name: /this shared note has expired/i }),
    ).toBeInTheDocument()
  })

  it('stopped share says the sender stopped sharing', async () => {
    const t = createMemoryTransport()
    const h = host(t)
    const created = await h.create(note(), { expiresInMs: 300_000, password: null })
    await h.stop(created.id)
    view(t, created.link)
    expect(await screen.findByRole('heading', { name: /stopped sharing/i })).toBeInTheDocument()
  })

  it('stays readable after the countdown hits zero', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
    const t = createMemoryTransport()
    const created = await host(t).create(note(), { expiresInMs: 60_000, password: null })
    view(t, created.link)
    await screen.findByRole('textbox', { name: /shared note/i })
    const banner = document.querySelector('[data-banner]') as HTMLElement
    const before = banner.textContent
    act(() => void vi.advanceTimersByTime(1000))
    expect(banner.textContent).not.toBe(before)
    act(() => void vi.advanceTimersByTime(70_000))
    expect(banner).toHaveTextContent(/link has expired · you can still save your copy/i)
    expect(screen.getByRole('textbox', { name: /shared note/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save to my notes/i })).toBeEnabled()
  })
})
