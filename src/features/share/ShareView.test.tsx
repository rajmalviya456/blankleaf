import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DB_NAME, openDb, type BlankleafDB } from '../../db/db'
import { DEFAULT_SETTINGS, newNoteDraft } from '../../domain/defaults'
import type { Note } from '../../domain/types'
import { __setPbkdf2Iterations, PBKDF2_ITERATIONS } from './crypto'
import { createShareHost, type ShareHost } from './host'
import { parseShareHash } from './link'
import { createMemoryTransport } from './memoryTransport'
import { ShareView } from './ShareView'
import { TransportError, type ShareTransport } from './transport'

beforeAll(() => __setPbkdf2Iterations(1000))
afterAll(() => __setPbkdf2Iterations(PBKDF2_ITERATIONS))

let db: BlankleafDB
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
  const h = createShareHost({ db, transport: t, appUrl: 'https://x.dev/blankleaf/', channel: null })
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
    expect(names).not.toContain(DB_NAME)
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
    const link = `https://x.dev/blankleaf/#/s/${'A'.repeat(43)}.1.n`
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

  it('the waiting screen lets the recipient go to their notes', async () => {
    const t = createMemoryTransport()
    const h = host(t)
    const created = await h.create(note(), { expiresInMs: 300_000, password: null })
    h.dispose()
    const { onClose, user } = view(t, created.link)
    await user.click(
      await screen.findByRole('button', { name: /go to my notes/i }, { timeout: 4000 }),
    )
    expect(onClose).toHaveBeenCalled()
  })

  it('Markdown too deep for the preview leaves the text on screen and Save working', async () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
    onTestFinished(() => quiet.mockRestore())
    // A sender can share anything: thousands of nested quotes overflow the Markdown pipeline.
    const content = '>'.repeat(2500) + ' x'
    const t = createMemoryTransport()
    const created = await host(t).create(note({ title: 'quotes', content, mode: 'markdown' }), {
      expiresInMs: 300_000,
      password: null,
    })
    const { onSave, user } = view(t, created.link)
    // Shown as plain text instead (by whichever boundary catches it first).
    expect(await screen.findByText(content)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /save to my notes/i }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ content, mode: 'markdown' }))
  })

  it('fits a phone: the banner gets its own line and every action is a 44px target', async () => {
    const t = createMemoryTransport()
    const created = await host(t).create(note(), { expiresInMs: 300_000, password: null })
    view(t, created.link)
    await screen.findByRole('button', { name: /save to my notes/i })
    const banner = document.querySelector('[data-banner]') as HTMLElement
    expect(banner.className).toContain('max-sm:basis-full')
    for (const name of [/download/i, /save to my notes/i, /close/i])
      expect(screen.getByRole('button', { name }).className).toContain('max-sm:h-11')
  })
})

describe('screen readers and keyboards', () => {
  const soon = () => (Math.ceil(Date.now() / 1000) + 300).toString(36)

  it('a wrong password describes the password field and is announced', async () => {
    const t = createMemoryTransport()
    const created = await host(t).create(note(), {
      expiresInMs: 300_000,
      password: 'kq7m-x3vr-p9tz',
    })
    const { user } = view(t, created.link)
    await user.type(screen.getByLabelText(/^password$/i), 'nope-nope-nope{Enter}')
    await screen.findByText('Wrong password. Try again.')
    const field = screen.getByLabelText(/^password$/i)
    expect(field).toHaveAccessibleDescription(/wrong password/i)
    expect(screen.getByRole('alert')).toHaveTextContent('Wrong password. Try again.')
    // The field is where the next try is typed: focus stays there, not on the heading.
    expect(field).toHaveFocus()
  })

  it('too many wrong attempts describe the password field', async () => {
    const t = createMemoryTransport()
    const created = await host(t).create(note(), {
      expiresInMs: 300_000,
      password: 'kq7m-x3vr-p9tz',
    })
    const { user } = view(t, created.link)
    for (let i = 0; i < 6; i++) {
      await user.type(await screen.findByLabelText(/^password$/i), `wrong-${i}-wrong{Enter}`)
      await screen.findByText(i < 5 ? 'Wrong password. Try again.' : /too many wrong attempts/i)
    }
    expect(screen.getByLabelText(/^password$/i)).toHaveAccessibleDescription(
      /too many wrong attempts/i,
    )
  })

  it('says what the page is doing in a status message: waiting for the sender', async () => {
    const t = createMemoryTransport()
    const h = host(t)
    const created = await h.create(note(), { expiresInMs: 300_000, password: null })
    h.dispose()
    view(t, created.link)
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(/waiting for the sender/i),
    )
  })

  it('when the note arrives, focus moves to its heading', async () => {
    const t = createMemoryTransport()
    const created = await host(t).create(note(), { expiresInMs: 300_000, password: null })
    view(t, created.link)
    await screen.findByRole('textbox', { name: /shared note/i })
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('api-fix.js')
    expect(document.activeElement).not.toBe(document.body)
    expect(heading).toHaveFocus()
    expect(screen.getByRole('status')).toHaveTextContent(/shared note opened/i)
  })

  it('a card that replaces the one in use takes focus to its heading', async () => {
    // Each connection attempt fails only when the test says so: no state is too brief to see.
    const attempts: (() => void)[] = []
    const down: ShareTransport = {
      host: () => Promise.reject(new TransportError('unavailable')),
      connect: () =>
        new Promise((_, reject) => attempts.push(() => reject(new TransportError('unavailable')))),
    }
    const { user } = view(down, `https://x.dev/blankleaf/#/s/${'A'.repeat(43)}.${soon()}.n`)
    const heading = () => screen.getByRole('heading', { name: /couldn’t reach the sharing/i })
    await waitFor(() => expect(attempts).toHaveLength(1))
    act(() => attempts[0]())
    await waitFor(() => expect(heading()).toHaveFocus())
    await user.click(screen.getByRole('button', { name: /try again/i }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/opening/i))
    await waitFor(() => expect(attempts).toHaveLength(2))
    act(() => attempts[1]())
    await waitFor(() => expect(heading()).toHaveFocus())
    expect(screen.getByRole('status')).toHaveTextContent(/couldn’t reach the sharing service/i)
  })
})

describe('pull-to-refresh', () => {
  it('is held back while the share page is shown, and allowed again on leaving', async () => {
    const t = createMemoryTransport()
    const created = await host(t).create(note(), { expiresInMs: 300_000, password: null })
    const page = () => document.documentElement.style.getPropertyValue('overscroll-behavior-y')
    view(t, created.link)
    expect(page()).toBe('contain')
    cleanups.pop()!() // unmount the share page
    expect(page()).toBe('')
  })
})

describe('search engines', () => {
  it('tells crawlers not to index or follow a share page, and undoes it on leaving', async () => {
    const t = createMemoryTransport()
    const created = await host(t).create(note(), { expiresInMs: 300_000, password: null })
    const robots = () => document.head.querySelector('meta[name="robots"]')?.getAttribute('content')
    document.head.insertAdjacentHTML('beforeend', '<meta name="robots" content="index, follow">')
    view(t, created.link)
    expect(robots()).toBe('noindex, nofollow, noarchive')
    cleanups.pop()!() // unmount the share page
    expect(robots()).toBe('index, follow')
    document.head.querySelector('meta[name="robots"]')?.remove()
  })
})
