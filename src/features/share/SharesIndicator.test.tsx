import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ShareRow } from '../../db/db'
import { toastStore } from '../../ui/toast'
import type { ShareHost } from './host'
import { SharesIndicator } from './SharesIndicator'
import { setShareHost } from './shareStore'

const row = (patch: Partial<ShareRow>): ShareRow => ({
  id: crypto.randomUUID(),
  noteId: 'n',
  title: 'plans',
  keyB64: 'k',
  exp: 1,
  peerId: 'p',
  readTokenHash: 'h',
  password: 'kq7m-x3vr-p9tz',
  iv: '',
  ciphertext: '',
  createdAt: Date.now(),
  expiresAt: Date.now() + 247_000,
  opens: 0,
  lastOpenedAt: null,
  failures: 0,
  coolDownUntil: 0,
  coolDownMs: 30_000,
  stopped: false,
  ...patch,
})

function fakeHost(initial: ShareRow[]) {
  let rows = initial
  const listeners = new Set<() => void>()
  const host = {
    active: () => rows,
    subscribe: (cb: () => void) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    messageFor: (r: ShareRow) => `MESSAGE for ${r.title} Password: ${r.password}`,
    linkFor: () => 'link',
    stop: vi.fn(async (id: string) => {
      rows = rows.filter((r) => r.id !== id)
      listeners.forEach((cb) => cb())
    }),
    set(next: ShareRow[]) {
      rows = next
      listeners.forEach((cb) => cb())
    },
  }
  setShareHost(host as unknown as ShareHost)
  return host
}

beforeEach(() => toastStore.getState().clear())
afterEach(() => {
  setShareHost(null)
  vi.useRealTimers()
})

describe('SharesIndicator', () => {
  it('hidden with no shares; shows count and soonest time left', () => {
    const host = fakeHost([])
    const { container } = render(<SharesIndicator />)
    expect(container).toBeEmptyDOMElement()
    act(() => host.set([row({ expiresAt: Date.now() + 247_000 })]))
    expect(screen.getByRole('button', { name: /sharing 1 note/i })).toHaveTextContent(
      /4:0[67] left/,
    )
    act(() =>
      host.set([row({ expiresAt: Date.now() + 52_000 }), row({ expiresAt: Date.now() + 900_000 })]),
    )
    expect(screen.getByRole('button', { name: /sharing 2 notes/i })).toHaveTextContent(
      /next ends in 0:5[12]/,
    )
  })

  it('indicator and each popover row tick every second, bars shrinking', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
    fakeHost([row({})])
    render(<SharesIndicator />)
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const button = screen.getByRole('button', { name: /sharing 1 note/i })
    const before = button.textContent
    act(() => void vi.advanceTimersByTime(1000))
    expect(button.textContent).not.toBe(before)
    await user.click(button)
    const pop = await screen.findByRole('dialog', { name: /active shares/i })
    const bar = within(pop).getByRole('progressbar')
    const w1 = parseFloat(bar.style.width)
    act(() => void vi.advanceTimersByTime(5000))
    expect(parseFloat(bar.style.width)).toBeLessThan(w1)
  })

  it('lists every active share with opens; Copy message includes the stored password', async () => {
    fakeHost([
      row({ title: 'plans', opens: 2, lastOpenedAt: Date.now() - 60_000 }),
      row({ title: 'logs', opens: 0 }),
    ])
    render(<SharesIndicator />)
    const user = userEvent.setup()
    const writeText = vi.fn(async () => {})
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    await user.click(screen.getByRole('button', { name: /sharing 2 notes/i }))
    const pop = await screen.findByRole('dialog', { name: /active shares/i })
    expect(within(pop).getByText('plans')).toBeInTheDocument()
    expect(within(pop).getByText('logs')).toBeInTheDocument()
    expect(within(pop).getByText(/opened 2 times/i)).toBeInTheDocument()
    expect(within(pop).getByText(/not opened yet/i)).toBeInTheDocument()
    await user.click(within(pop).getAllByRole('button', { name: /copy message/i })[0])
    expect(writeText).toHaveBeenCalledWith('MESSAGE for plans Password: kq7m-x3vr-p9tz')
  })

  it('stop from the popover ends the share and shows a toast', async () => {
    const host = fakeHost([row({ title: 'plans' })])
    render(<SharesIndicator />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /sharing 1 note/i }))
    const pop = await screen.findByRole('dialog', { name: /active shares/i })
    await user.click(within(pop).getByRole('button', { name: /stop sharing/i }))
    expect(host.stop).toHaveBeenCalled()
    expect(toastStore.getState().toasts.at(-1)?.msg).toMatch(/share ended/i)
  })
})
