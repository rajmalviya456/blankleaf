import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DB_NAME, openDb, type BlankleafDB } from '../../db/db'
import { DEFAULT_SETTINGS, newNoteDraft } from '../../domain/defaults'
import { __setPbkdf2Iterations, PBKDF2_ITERATIONS } from './crypto'
import { createShareHost } from './host'
import { createMemoryTransport } from './memoryTransport'
import { takeShareEntry, type ShareEntry } from './shareEntry'
import { showSharePage } from './sharePage'
import type { ShareTransport } from './transport'

// Lets one test make the share page itself fail; the others get the real one.
const crash = vi.hoisted(() => ({ on: false }))
vi.mock('./ShareView', async (importOriginal) => {
  const real = await importOriginal<typeof import('./ShareView')>()
  const { createElement } = await import('react')
  return {
    ...real,
    ShareView(props: Parameters<typeof real.ShareView>[0]) {
      if (crash.on) throw new Error('boom')
      return createElement(real.ShareView, props)
    },
  }
})

beforeAll(() => __setPbkdf2Iterations(1000))
afterAll(() => __setPbkdf2Iterations(PBKDF2_ITERATIONS))

const goTo = (url: string) => history.replaceState(null, '', url)
let db: BlankleafDB
let el: HTMLElement
let remove: (() => void) | undefined
const cleanups: (() => void)[] = []
beforeEach(() => {
  db = openDb(`page-${Math.random()}`)
  el = document.body.appendChild(document.createElement('div'))
  sessionStorage.clear()
  goTo('/blankleaf/')
})
afterEach(async () => {
  act(() => remove?.())
  remove = undefined
  el.remove()
  cleanups.splice(0).forEach((f) => f())
  crash.on = false
  vi.restoreAllMocks()
  db.close()
  await db.delete()
})

function show(entry: ShareEntry, transport: ShareTransport = createMemoryTransport()) {
  const openApp = vi.fn()
  act(() => {
    remove = showSharePage(el, entry, openApp, transport)
  })
  return { openApp, user: userEvent.setup() }
}

/** A note shared by a sender who is online, its link opened in this tab. */
async function opened() {
  const t = createMemoryTransport()
  const h = createShareHost({ db, transport: t, appUrl: 'https://x.dev/blankleaf/', channel: null })
  cleanups.push(() => h.dispose())
  const created = await h.create(
    { ...newNoteDraft(1, DEFAULT_SETTINGS), title: 'plans', content: 'the plan' },
    { expiresInMs: 300_000, password: null },
  )
  const url = new URL(created.link)
  goTo(url.pathname + url.hash)
  return { t, h, created, entry: takeShareEntry()! }
}

describe('a cut-off share link', () => {
  it('says the link is incomplete, with a way to the notepad', async () => {
    const { openApp, user } = show({ kind: 'broken' })
    expect(
      await screen.findByRole('heading', { name: 'This share link is incomplete' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Copy the whole link from the message you got, then open it again.'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /go to my notes/i }))
    expect(openApp).toHaveBeenCalledWith(undefined)
  })
})

describe('reloading the share page', () => {
  it('shows the share page again, not the notepad, and still writes nothing', async () => {
    const { t } = await opened()
    // The reload: the link has left the address bar by now.
    const again = takeShareEntry()
    expect(again).not.toBeNull()
    show(again!, t)
    expect(await screen.findByRole('textbox', { name: /shared note/i })).toHaveTextContent(
      'the plan',
    )
    expect((await indexedDB.databases()).map((d) => d.name)).not.toContain(DB_NAME)
  })

  it('Save forgets the link: a reload then opens the notepad', async () => {
    const { t, entry } = await opened()
    expect(takeShareEntry()).toEqual(entry)
    const { openApp, user } = show(entry, t)
    await user.click(await screen.findByRole('button', { name: /save to my notes/i }))
    expect(openApp).toHaveBeenCalledWith(expect.objectContaining({ title: 'plans (shared)' }))
    expect(takeShareEntry()).toBeNull()
  })

  it('Close forgets the link too', async () => {
    const { t, entry } = await opened()
    expect(takeShareEntry()).toEqual(entry)
    const { openApp, user } = show(entry, t)
    await user.click(await screen.findByRole('button', { name: 'Close' }))
    expect(openApp).toHaveBeenCalledWith(undefined)
    expect(takeShareEntry()).toBeNull()
  })

  it('a share that has stopped is forgotten: nothing more can come from it', async () => {
    const { t, h, created, entry } = await opened()
    await h.stop(created.id)
    expect(takeShareEntry()).toEqual(entry)
    show(entry, t)
    await screen.findByRole('heading', { name: /stopped sharing/i })
    await waitFor(() => expect(takeShareEntry()).toBeNull())
  })

  it('an expired link is forgotten', async () => {
    goTo(`/blankleaf/#/s/${'A'.repeat(43)}.1.n`)
    const entry = takeShareEntry()!
    expect(takeShareEntry()).toEqual(entry)
    show(entry)
    await screen.findByRole('heading', { name: /has expired/i })
    await waitFor(() => expect(takeShareEntry()).toBeNull())
  })
})

describe('if the share page itself fails', () => {
  it('offers a way out instead of a blank page', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    crash.on = true
    const { entry } = await opened()
    const { openApp, user } = show(entry)
    expect(
      await screen.findByRole('heading', { name: /couldn’t show this shared note/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /go to my notes/i }))
    expect(openApp).toHaveBeenCalledWith(undefined)
    expect(takeShareEntry()).toBeNull()
  })
})
