import { openDb, type BlankleafDB } from '../../db/db'
import { DEFAULT_SETTINGS, newNoteDraft } from '../../domain/defaults'
import type { Note } from '../../domain/types'
import { fromB64url, toB64url } from './b64'
import {
  __setPbkdf2Iterations,
  decryptSnapshot,
  deriveSecrets,
  PBKDF2_ITERATIONS,
  unpackSnapshot,
} from './crypto'
import {
  COOL_DOWN_START_MS,
  createShareHost,
  MAX_SNAPSHOT_BYTES,
  type LockManagerLike,
  type ShareHost,
} from './host'
import { parseShareHash } from './link'
import { createMemoryTransport } from './memoryTransport'
import { isReply, type Reply } from './protocol'
import { listActiveShares } from './sharesRepo'
import type { ShareTransport } from './transport'

beforeAll(() => __setPbkdf2Iterations(1000))
afterAll(() => __setPbkdf2Iterations(PBKDF2_ITERATIONS))

let db: BlankleafDB
let clock = 1_800_000_000_000
const now = () => clock
const hosts: ShareHost[] = []

beforeEach(() => {
  db = openDb(`host-${Math.random()}`)
  clock = 1_800_000_000_000
})
afterEach(async () => {
  hosts.splice(0).forEach((h) => h.dispose())
  db.close()
  await db.delete()
})

/** Fake Web Locks: exclusive per name, queued, granted asynchronously like the real API. */
function fakeLocks(): LockManagerLike {
  const queues = new Map<string, Promise<void>>()
  return {
    request(name, _opts, cb) {
      const prev = queues.get(name) ?? Promise.resolve()
      const run = prev.then(() => new Promise<void>((r) => setTimeout(r, 0))).then(() => cb())
      queues.set(
        name,
        run.then(
          () => undefined,
          () => undefined,
        ),
      )
      return run
    },
  }
}

const note = (content = 'secret plans\nline two'): Note => ({
  ...newNoteDraft(1, DEFAULT_SETTINGS),
  title: 'plans',
  content,
})

function makeHost(transport: ShareTransport, locks = fakeLocks()) {
  const h = createShareHost({
    db,
    transport,
    appUrl: 'https://x.dev/blankleaf/',
    now,
    locks,
    closeAfterReplyMs: 10,
  })
  hosts.push(h)
  return h
}

async function ask(
  transport: ShareTransport,
  link: string,
  password: string | null,
): Promise<Reply> {
  const parts = parseShareHash(new URL(link).hash)!
  const s = await deriveSecrets(parts.key, parts.exp, password)
  const conn = await transport.connect(s.peerId, 500)
  const reply = new Promise<Reply>((resolve) => conn.onMessage((m) => isReply(m) && resolve(m)))
  conn.send({ type: 'hello', v: 1, readToken: toB64url(s.readToken) })
  const r = await reply
  conn.close()
  return r
}

describe('share host', () => {
  it('create stores ciphertext, never the plaintext, and returns link + message', async () => {
    const t = createMemoryTransport()
    const host = makeHost(t)
    const created = await host.create(note('TOP-SECRET-CONTENT'), {
      expiresInMs: 300_000,
      password: 'kq7m-x3vr-p9tz',
    })
    expect(created.link).toMatch(/^https:\/\/x\.dev\/blankleaf\/#\/s\/.+\..+\.p$/)
    expect(created.message).toContain('Password: kq7m-x3vr-p9tz')
    expect(created.expiresAt).toBe(clock + 300_000)
    const rows = await db.shares.toArray()
    expect(rows).toHaveLength(1)
    expect(JSON.stringify(rows[0])).not.toContain('TOP-SECRET-CONTENT')
    expect(host.active().map((r) => r.id)).toEqual([created.id])
  })

  it('names an auto-titled note after its first line', async () => {
    const host = makeHost(createMemoryTransport())
    await host.create(
      { ...note('Grocery list\nmilk'), title: null },
      { expiresInMs: 300_000, password: null },
    )
    expect(host.active()[0].title).toBe('Grocery list')
  })

  it('right token gets the share and counts an open', async () => {
    const t = createMemoryTransport()
    const host = makeHost(t)
    const created = await host.create(note(), { expiresInMs: 300_000, password: 'kq7m-x3vr-p9tz' })
    const r = await ask(t, created.link, 'kq7mx3vrp9tz')
    expect(r.type).toBe('share')
    const parts = parseShareHash(new URL(created.link).hash)!
    const s = await deriveSecrets(parts.key, parts.exp, 'kq7m-x3vr-p9tz')
    if (r.type !== 'share') throw new Error()
    const snap = await unpackSnapshot(
      await decryptSnapshot(s, fromB64url(r.iv), fromB64url(r.ciphertext)),
    )
    expect(snap.content).toBe('secret plans\nline two')
    await vi.waitFor(async () => expect((await db.shares.get(created.id))?.opens).toBe(1))
  })

  it('wrong token gets denied and no ciphertext', async () => {
    const t = createMemoryTransport()
    const host = makeHost(t)
    const created = await host.create(note(), { expiresInMs: 300_000, password: 'kq7m-x3vr-p9tz' })
    const r = await ask(t, created.link, 'wrong-password')
    expect(r).toEqual({ type: 'denied' })
    expect(JSON.stringify(r)).not.toContain('ciphertext')
  })

  it('5 failures start a 30s cool-down that doubles', async () => {
    const t = createMemoryTransport()
    const host = makeHost(t)
    const created = await host.create(note(), {
      expiresInMs: 3_600_000,
      password: 'kq7m-x3vr-p9tz',
    })
    for (let i = 0; i < 5; i++)
      expect((await ask(t, created.link, 'nope-nope-1')).type).toBe('denied')
    const wait = await ask(t, created.link, 'kq7m-x3vr-p9tz')
    expect(wait).toEqual({ type: 'wait', retryInMs: COOL_DOWN_START_MS })
    clock += COOL_DOWN_START_MS
    for (let i = 0; i < 5; i++)
      expect((await ask(t, created.link, 'nope-nope-1')).type).toBe('denied')
    expect(await ask(t, created.link, 'kq7m-x3vr-p9tz')).toEqual({
      type: 'wait',
      retryInMs: 2 * COOL_DOWN_START_MS,
    })
    clock += 2 * COOL_DOWN_START_MS
    expect((await ask(t, created.link, 'kq7m-x3vr-p9tz')).type).toBe('share')
  })

  it('expired share replies expired and is deleted at expiry', async () => {
    const t = createMemoryTransport()
    const host = makeHost(t)
    clock = Date.now()
    const created = await host.create(note(), { expiresInMs: 1500, password: null })
    clock = created.expiresAt
    expect(await ask(t, created.link, null)).toEqual({ type: 'expired' })
    await vi.waitFor(
      async () => {
        expect(await db.shares.count()).toBe(0)
        expect(host.active()).toEqual([])
      },
      { timeout: 4000 },
    )
  })

  it('stop replies stopped to new connections, then deletes the row', async () => {
    const t = createMemoryTransport()
    const host = makeHost(t)
    const created = await host.create(note(), { expiresInMs: 300_000, password: null })
    await host.stop(created.id)
    expect(await db.shares.count()).toBe(0)
    expect(host.active()).toEqual([])
    expect(await ask(t, created.link, null)).toEqual({ type: 'stopped' })
  })

  it('resumes serving after restart; expired rows deleted', async () => {
    const t = createMemoryTransport()
    const first = makeHost(t)
    const live = await first.create(note(), { expiresInMs: 300_000, password: null })
    const old = await first.create(note(), { expiresInMs: 60_000, password: null })
    first.dispose()
    clock += 120_000
    const second = makeHost(t)
    await second.resume()
    expect(second.active().map((r) => r.id)).toEqual([live.id])
    expect(await db.shares.get(old.id)).toBeUndefined()
    // resume() re-registers in the background; a real recipient retries while it's offline.
    const reply = await vi.waitFor(() => ask(t, live.link, null), { timeout: 2000, interval: 20 })
    expect(reply.type).toBe('share')
  })

  it('only one host serves a share (lock)', async () => {
    const t = createMemoryTransport()
    const locks = fakeLocks()
    const a = makeHost(t, locks)
    const created = await a.create(note(), { expiresInMs: 300_000, password: null })
    const b = makeHost(t, locks)
    const hostSpy = vi.spyOn(t, 'host')
    await b.resume()
    await new Promise((r) => setTimeout(r, 20))
    expect(hostSpy).not.toHaveBeenCalled()
    a.dispose()
    await vi.waitFor(() => expect(hostSpy).toHaveBeenCalledTimes(1))
    expect((await ask(t, created.link, null)).type).toBe('share')
  })

  it('rejects snapshots over 5 MB and invalid passwords', async () => {
    const host = makeHost(createMemoryTransport())
    expect(MAX_SNAPSHOT_BYTES).toBe(5 * 1024 * 1024)
    const chunks: string[] = []
    for (let i = 0; i < 100; i++) {
      const bytes = crypto.getRandomValues(new Uint8Array(65_536))
      chunks.push(Array.from(bytes, (b) => String.fromCharCode(33 + (b % 90))).join(''))
    }
    const random = chunks.join('')
    await expect(
      host.create(note(random), { expiresInMs: 300_000, password: null }),
    ).rejects.toMatchObject({ kind: 'too-large' })
    await expect(
      host.create(note(), { expiresInMs: 300_000, password: 'short' }),
    ).rejects.toMatchObject({ kind: 'invalid-password' })
    expect(await listActiveShares(db, clock)).toEqual([])
  }, 20_000)

  it('fails cleanly when the sharing service is unreachable', async () => {
    const t = createMemoryTransport()
    vi.spyOn(t, 'host').mockRejectedValue(Object.assign(new Error('down'), { kind: 'unavailable' }))
    const host = makeHost(t)
    await expect(
      host.create(note(), { expiresInMs: 300_000, password: null }),
    ).rejects.toMatchObject({ kind: 'unavailable' })
    expect(await db.shares.count()).toBe(0)
  })
})

describe('share host without Web Locks', () => {
  it('serves when the lock manager runs callbacks synchronously', async () => {
    const t = createMemoryTransport()
    const syncLocks: LockManagerLike = { request: (_n, _o, cb) => cb() }
    const host = makeHost(t, syncLocks)
    const created = await host.create(note(), { expiresInMs: 300_000, password: null })
    expect((await ask(t, created.link, null)).type).toBe('share')
  })
})

describe('share host across windows', () => {
  /** Shared in-memory stand-in for BroadcastChannel between two hosts. */
  function hub() {
    const members = new Set<{ onmessage: ((e: MessageEvent) => void) | null }>()
    return () => {
      const ch = {
        onmessage: null as ((e: MessageEvent) => void) | null,
        postMessage(data: unknown) {
          for (const m of members)
            if (m !== ch) queueMicrotask(() => m.onmessage?.({ data } as MessageEvent))
        },
        close() {
          members.delete(ch)
        },
      }
      members.add(ch)
      return ch
    }
  }

  it('other windows see new shares and can stop them; the serving window stops at once', async () => {
    const t = createMemoryTransport()
    const locks = fakeLocks()
    const channel = hub()
    const a = createShareHost({
      db,
      transport: t,
      appUrl: 'https://x.dev/blankleaf/',
      now,
      locks,
      channel: channel(),
    })
    const b = createShareHost({
      db,
      transport: t,
      appUrl: 'https://x.dev/blankleaf/',
      now,
      locks,
      channel: channel(),
    })
    hosts.push(a, b)
    const created = await a.create(note(), { expiresInMs: 300_000, password: null })
    await vi.waitFor(() => expect(b.active().map((r) => r.id)).toEqual([created.id]))
    await b.stop(created.id)
    await vi.waitFor(() => expect(a.active()).toEqual([]))
    expect(await ask(t, created.link, null)).toEqual({ type: 'stopped' })
  })
})

describe('share host hardening', () => {
  it('parallel wrong passwords still trigger the cool-down after 5', async () => {
    const t = createMemoryTransport()
    const host = makeHost(t)
    const created = await host.create(note(), {
      expiresInMs: 3_600_000,
      password: 'kq7m-x3vr-p9tz',
    })
    const replies = await Promise.all(
      Array.from({ length: 10 }, () => ask(t, created.link, 'wrong-guess-1')),
    )
    expect(replies.filter((r) => r.type === 'denied')).toHaveLength(5)
    expect(replies.filter((r) => r.type === 'wait')).toHaveLength(5)
    expect((await ask(t, created.link, 'kq7m-x3vr-p9tz')).type).toBe('wait')
  })

  it('a sender error still answers instead of leaving the recipient hanging', async () => {
    const t = createMemoryTransport()
    const host = makeHost(t)
    const created = await host.create(note(), { expiresInMs: 300_000, password: null })
    vi.spyOn(db.shares, 'get').mockRejectedValueOnce(new Error('db closed'))
    expect(await ask(t, created.link, null)).toEqual({ type: 'stopped' })
  })

  it('closes a connection after answering', async () => {
    const t = createMemoryTransport()
    const host = makeHost(t)
    const created = await host.create(note(), { expiresInMs: 300_000, password: null })
    const parts = parseShareHash(new URL(created.link).hash)!
    const s = await deriveSecrets(parts.key, parts.exp, null)
    const conn = await t.connect(s.peerId, 500)
    const closed = new Promise<void>((r) => conn.onClose(r))
    conn.send({ type: 'hello', v: 1, readToken: toB64url(s.readToken) })
    await closed
  })

  it('every window drops a share from its list once it expires', async () => {
    const t = createMemoryTransport()
    const locks = fakeLocks()
    clock = Date.now()
    const realNow = () => Date.now()
    const a = createShareHost({
      db,
      transport: t,
      appUrl: 'https://x.dev/',
      now: realNow,
      locks,
      channel: null,
    })
    const b = createShareHost({
      db,
      transport: t,
      appUrl: 'https://x.dev/',
      now: realNow,
      locks,
      channel: null,
    })
    hosts.push(a, b)
    await a.create(note(), { expiresInMs: 900, password: null })
    await b.refresh()
    expect(b.active()).toHaveLength(1)
    await vi.waitFor(() => expect(b.active()).toEqual([]), { timeout: 3000 })
  })
})
