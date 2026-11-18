import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { COMMANDS } from '../../commands/registry'
import { createAppStore, initStore } from '../../store/store'
import type { CreatedShare, ShareHost } from './host'
import { ShareDialog } from './ShareDialog'
import { setShareHost, shareStore } from './shareStore'

function fakeHost(over: Partial<ShareHost> = {}) {
  const created: CreatedShare = {
    id: 's1',
    link: 'https://x.dev/blankleaf/#/s/KEY.exp.p',
    password: null,
    expiresAt: Date.now() + 300_000,
    message: 'MESSAGE',
  }
  const host = {
    create: vi.fn(async (_n, o) => ({
      ...created,
      password: o.password,
      expiresAt: Date.now() + o.expiresInMs,
      message: o.password ? `MSG with Password: ${o.password}` : 'MSG without password',
    })),
    stop: vi.fn(async () => {}),
    resume: vi.fn(),
    refresh: vi.fn(),
    stopServing: vi.fn(),
    active: () => [],
    linkFor: () => '',
    messageFor: () => '',
    subscribe: () => () => {},
    dispose: vi.fn(),
    ...over,
  } as unknown as ShareHost & { create: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }
  setShareHost(host)
  return host
}

function setup(content = 'hello world') {
  const store = initStore(createAppStore())
  const id = store.getState().newNote()
  store.getState().updateContent(id, content)
  // userEvent.setup() installs its own clipboard; replace it afterwards with a spy.
  const user = userEvent.setup()
  const writeText = vi.fn(async () => {})
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  render(<ShareDialog />)
  act(() => shareStore.getState().open(id))
  return { id, store, writeText, user }
}

afterEach(() => {
  act(() => shareStore.getState().close())
  vi.useRealTimers()
})

describe('ShareDialog', () => {
  it('opens from the Share note command for the active note', () => {
    const store = initStore(createAppStore())
    const id = store.getState().newNote()
    COMMANDS.find((c) => c.id === 'note.share')!.run({ store })
    expect(shareStore.getState().dialogNoteId).toBe(id)
  })

  it('password on by default with a generated value; ↻ changes it', async () => {
    fakeHost()
    const { user } = setup()
    const dialog = await screen.findByRole('dialog', { name: /share/i })
    expect(within(dialog).getByRole('switch', { name: /protect with password/i })).toBeChecked()
    const field = within(dialog).getByRole('textbox', { name: /^password$/i }) as HTMLInputElement
    expect(field.value).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/)
    const before = field.value
    await user.click(within(dialog).getByRole('button', { name: /new password/i }))
    expect(field.value).not.toBe(before)
  })

  it('custom password shorter than 8 disables Create', async () => {
    fakeHost()
    const { user } = setup()
    const dialog = await screen.findByRole('dialog', { name: /share/i })
    const field = within(dialog).getByRole('textbox', { name: /^password$/i })
    await user.clear(field)
    await user.type(field, 'short')
    expect(within(dialog).getByRole('button', { name: /create link/i })).toBeDisabled()
  })

  it('turning the password off hides it and the message has no Password line', async () => {
    const host = fakeHost()
    const { user, writeText } = setup()
    const dialog = await screen.findByRole('dialog', { name: /share/i })
    await user.click(within(dialog).getByRole('switch', { name: /protect with password/i }))
    expect(within(dialog).queryByRole('textbox', { name: /^password$/i })).toBeNull()
    await user.click(within(dialog).getByRole('button', { name: /create link/i }))
    expect(host.create).toHaveBeenCalledWith(expect.anything(), {
      expiresInMs: 300_000,
      password: null,
    })
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith('MSG without password'))
  })

  it('create copies the message and shows link, password and countdown', async () => {
    const host = fakeHost()
    const { user, writeText } = setup()
    const dialog = await screen.findByRole('dialog', { name: /share/i })
    await user.click(within(dialog).getByRole('radio', { name: '1 hour' }))
    const pw = (within(dialog).getByRole('textbox', { name: /^password$/i }) as HTMLInputElement)
      .value
    await user.click(within(dialog).getByRole('button', { name: /create link/i }))
    expect(host.create).toHaveBeenCalledWith(expect.anything(), {
      expiresInMs: 3_600_000,
      password: pw,
    })
    expect(await within(dialog).findByText(/message copied/i)).toBeInTheDocument()
    expect(writeText).toHaveBeenCalledWith(`MSG with Password: ${pw}`)
    expect(
      within(dialog).getByDisplayValue('https://x.dev/blankleaf/#/s/KEY.exp.p'),
    ).toBeInTheDocument()
    expect(within(dialog).getByDisplayValue(pw)).toBeInTheDocument()
    expect(within(dialog).getByText(/expires in/i)).toHaveTextContent(/1:00:00|59:59/)
    expect(within(dialog).getByText(/keep blankleaf open/i)).toBeInTheDocument()
  })

  it('countdown ticks every second and the bar shrinks', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
    fakeHost()
    const { user } = setup()
    const dialog = await screen.findByRole('dialog', { name: /share/i })
    await user.click(within(dialog).getByRole('switch', { name: /protect with password/i }))
    await user.click(within(dialog).getByRole('button', { name: /create link/i }))
    await within(dialog).findByText(/message copied/i)
    const label = () => within(dialog).getByText(/expires in/i).textContent
    const bar = () => (within(dialog).getByRole('progressbar') as HTMLElement).style.width
    const firstLabel = label()
    const firstBar = parseFloat(bar())
    act(() => void vi.advanceTimersByTime(1000))
    expect(label()).not.toBe(firstLabel)
    expect(parseFloat(bar())).toBeLessThan(firstBar)
    act(() => void vi.advanceTimersByTime(300_000))
    expect(label()).toMatch(/0:00/)
    expect(parseFloat(bar())).toBe(0)
  })

  it('stop calls host.stop and closes', async () => {
    const host = fakeHost()
    const { user } = setup()
    const dialog = await screen.findByRole('dialog', { name: /share/i })
    await user.click(within(dialog).getByRole('button', { name: /create link/i }))
    await within(dialog).findByText(/message copied/i)
    await user.click(within(dialog).getByRole('button', { name: /stop sharing/i }))
    expect(host.stop).toHaveBeenCalledWith('s1')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows an error when sharing is unavailable', async () => {
    fakeHost({
      create: vi.fn(async () => {
        throw Object.assign(new Error('Couldn’t reach the sharing service.'), {
          kind: 'unavailable',
        })
      }),
    } as Partial<ShareHost>)
    const { user } = setup()
    const dialog = await screen.findByRole('dialog', { name: /share/i })
    await user.click(within(dialog).getByRole('button', { name: /create link/i }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      /couldn’t reach the sharing service/i,
    )
  })

  it('shows the size against the 5 MB limit', async () => {
    fakeHost()
    setup('x'.repeat(5000))
    const dialog = await screen.findByRole('dialog', { name: /share/i })
    expect(await within(dialog).findByText(/of 5 MB/)).toBeInTheDocument()
  })

  it('explains when sharing needs browser storage', async () => {
    setShareHost(null)
    setup()
    const dialog = await screen.findByRole('dialog', { name: /share/i })
    expect(within(dialog).getByText(/needs browser storage/i)).toBeInTheDocument()
    fireEvent.keyDown(dialog, { key: 'Escape' })
  })

  it('says plainly that expiry can’t take back a copy already opened', async () => {
    fakeHost()
    setup()
    const dialog = await screen.findByRole('dialog', { name: /share/i })
    expect(within(dialog).getByText(/can keep a copy/i)).toBeInTheDocument()
  })
})
