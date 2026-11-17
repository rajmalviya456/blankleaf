import { openDb, type NotepadzDB } from '../../db/db'
import { DEFAULT_SETTINGS, newNoteDraft } from '../../domain/defaults'
import { __setPbkdf2Iterations, PBKDF2_ITERATIONS } from './crypto'
import { createShareHost, type ShareHost } from './host'
import { parseShareHash } from './link'
import { createMemoryTransport } from './memoryTransport'
import { createReceiver, type ReceiveState } from './receiver'
import type { ShareTransport } from './transport'

beforeAll(() => __setPbkdf2Iterations(1000))
afterAll(() => __setPbkdf2Iterations(PBKDF2_ITERATIONS))

let db: NotepadzDB
const cleanups: (() => void)[] = []
beforeEach(() => {
  db = openDb(`recv-${Math.random()}`)
})
afterEach(async () => {
  cleanups.splice(0).forEach((f) => f())
  db.close()
  await db.delete()
})

const note = { ...newNoteDraft(1, DEFAULT_SETTINGS), title: 'plans', content: 'the plan' }

function host(t: ShareTransport): ShareHost {
  const h = createShareHost({ db, transport: t, appUrl: 'https://x.dev/notepadz/' })
  cleanups.push(() => h.dispose())
  return h
}

function receive(
  t: ShareTransport,
  link: string,
  o: { now?: () => number; retryMs?: number } = {},
) {
  const parts = parseShareHash(new URL(link).hash)!
  const r = createReceiver({ parts, transport: t, connectTimeoutMs: 200, ...o })
  cleanups.push(() => r.dispose())
  const until = (s: ReceiveState['s']) =>
    vi.waitFor(() => expect(r.state().s).toBe(s), { timeout: 3000 })
  return { r, until }
}

describe('receiver', () => {
  it('expired link never connects', () => {
    const t = createMemoryTransport()
    const spy = vi.spyOn(t, 'connect')
    const link = 'https://x.dev/notepadz/#/s/' + 'A'.repeat(43) + '.1.n'
    const { r } = receive(t, link)
    expect(r.state()).toEqual({ s: 'expired' })
    expect(spy).not.toHaveBeenCalled()
  })

  it('asks for the password before connecting', async () => {
    const t = createMemoryTransport()
    const created = await host(t).create(note, { expiresInMs: 300_000, password: 'kq7m-x3vr-p9tz' })
    const spy = vi.spyOn(t, 'connect')
    const { r } = receive(t, created.link)
    expect(r.state().s).toBe('need-password')
    expect(spy).not.toHaveBeenCalled()
  })

  it('no password: goes straight to the note', async () => {
    const t = createMemoryTransport()
    const created = await host(t).create(note, { expiresInMs: 300_000, password: null })
    const { r, until } = receive(t, created.link)
    await until('ready')
    const st = r.state()
    if (st.s !== 'ready') throw new Error()
    expect(st.snapshot).toMatchObject({ title: 'plans', content: 'the plan' })
    expect(st.expiresAt).toBe(created.expiresAt)
  })

  it('wrong password → wrong-password, right one → ready with snapshot', async () => {
    const t = createMemoryTransport()
    const created = await host(t).create(note, { expiresInMs: 300_000, password: 'kq7m-x3vr-p9tz' })
    const { r, until } = receive(t, created.link)
    r.submitPassword('wrong-wrong')
    await until('wrong-password')
    r.submitPassword('kq7mx3vrp9tz')
    await until('ready')
  })

  it('cool-down surfaces as cooldown with retryAt', async () => {
    const t = createMemoryTransport()
    const created = await host(t).create(note, { expiresInMs: 300_000, password: 'kq7m-x3vr-p9tz' })
    const { r, until } = receive(t, created.link)
    for (let i = 0; i < 5; i++) {
      r.submitPassword(`wrong-${i}-wrong`)
      await until('wrong-password')
    }
    r.submitPassword('kq7m-x3vr-p9tz')
    await until('cooldown')
    const st = r.state()
    if (st.s !== 'cooldown') throw new Error()
    expect(st.retryAt).toBeGreaterThan(Date.now() + 20_000)
  })

  it('waits while the sender is offline, then connects when it comes online', async () => {
    const t = createMemoryTransport()
    const sender = host(t)
    const created = await sender.create(note, { expiresInMs: 300_000, password: null })
    sender.dispose()
    const { r, until } = receive(t, created.link, { retryMs: 50 })
    await until('waiting')
    expect(r.state()).toMatchObject({ s: 'waiting', expiresAt: created.expiresAt })
    await host(t).resume()
    await until('ready')
  })

  it('stopped share → stopped', async () => {
    const t = createMemoryTransport()
    const sender = host(t)
    const created = await sender.create(note, { expiresInMs: 300_000, password: null })
    await sender.stop(created.id)
    const { until } = receive(t, created.link)
    await until('stopped')
  })

  it('switches waiting → expired at expiry', async () => {
    const t = createMemoryTransport()
    const exp = Math.ceil((Date.now() + 400) / 1000)
    const link = `https://x.dev/notepadz/#/s/${'A'.repeat(43)}.${exp.toString(36)}.n`
    const { until } = receive(t, link, { retryMs: 50 })
    await until('waiting')
    await until('expired')
  })

  it('a sender that never replies is treated as offline (keeps retrying)', async () => {
    const t = createMemoryTransport()
    const parts = parseShareHash(
      new URL(
        `https://x.dev/#/s/${'A'.repeat(43)}.${Math.ceil(Date.now() / 1000 + 300).toString(36)}.n`,
      ).hash,
    )!
    const { deriveSecrets } = await import('./crypto')
    const s = await deriveSecrets(parts.key, parts.exp, null)
    const silent = await t.host(s.peerId, () => {})
    cleanups.push(() => silent.stop())
    const r = createReceiver({
      parts,
      transport: t,
      connectTimeoutMs: 200,
      replyTimeoutMs: 100,
      retryMs: 50,
    })
    cleanups.push(() => r.dispose())
    await vi.waitFor(() => expect(r.state().s).toBe('waiting'), { timeout: 2000 })
  })
})
