/**
 * Sender side of link sharing (spec §5.4–5.5). This browser is the only place a shared copy
 * exists: it serves the encrypted snapshot over a ShareTransport until the share expires or is
 * stopped, enforcing the password check and the wrong-password cool-down itself.
 */
import type { NotepadzDB } from '../../db/db'
import type { Note } from '../../domain/types'
import { fromB64url, toB64url } from './b64'
import { deriveSecrets, encryptSnapshot, packSnapshot, sha256Hex, timingSafeEqual } from './crypto'
import { buildShareLink } from './link'
import { formatShareMessage } from './message'
import { isPasswordValid } from './password'
import { isHello, type Reply } from './protocol'
import {
  deleteShare,
  getShare,
  listActiveShares,
  purgeEndedShares,
  putShare,
  updateShare,
  type ShareRow,
} from './sharesRepo'
import type { Conn, Host, ShareTransport } from './transport'

export const MAX_SNAPSHOT_BYTES = 5 * 1024 * 1024
export const COOL_DOWN_START_MS = 30_000
const MAX_FAILURES = 5

export type ShareErrorKind = 'too-large' | 'invalid-password' | 'unavailable'

export class ShareError extends Error {
  readonly kind: ShareErrorKind
  constructor(kind: ShareErrorKind, message: string = kind) {
    super(message)
    this.kind = kind
  }
}

export interface CreateOptions {
  expiresInMs: number
  password: string | null
}

export interface CreatedShare {
  id: string
  link: string
  password: string | null
  expiresAt: number
  message: string
}

/** The slice of the Web Locks API we use (injectable for tests). */
export interface LockManagerLike {
  request<T>(name: string, options: { mode: 'exclusive' }, cb: () => Promise<T>): Promise<T>
}

export interface ShareHost {
  create(note: Note, o: CreateOptions): Promise<CreatedShare>
  stop(id: string): Promise<void>
  /** Purge ended shares, then serve every active one (one window per share, via locks). */
  resume(): Promise<void>
  /** Re-read the shares table (e.g. after another window created or stopped one). */
  refresh(): Promise<void>
  /** Stop serving `id` here without touching storage (another window stopped it). */
  stopServing(id: string): void
  active(): ShareRow[]
  linkFor(row: ShareRow): string
  messageFor(row: ShareRow): string
  subscribe(cb: () => void): () => void
  dispose(): void
}

interface Serving {
  host: Host | null
  release: () => void
  timer: ReturnType<typeof setTimeout> | undefined
  /** After Stop: keep answering "stopped" (no data held) until the original expiry. */
  tombstone: boolean
}

const noLocks: LockManagerLike = { request: (_n, _o, cb) => cb() }

export function createShareHost(o: {
  db: NotepadzDB
  transport: ShareTransport
  appUrl: string
  now?: () => number
  locks?: LockManagerLike
}): ShareHost {
  const { db, transport, appUrl } = o
  const now = o.now ?? Date.now
  const locks =
    o.locks ??
    ((typeof navigator !== 'undefined' && (navigator.locks as unknown as LockManagerLike)) ||
      noLocks)
  const serving = new Map<string, Serving>()
  const listeners = new Set<() => void>()
  let rows: ShareRow[] = []
  let disposed = false

  const notify = () => listeners.forEach((cb) => cb())
  const refresh = async () => {
    rows = await listActiveShares(db, now())
    notify()
  }

  const linkFor = (r: ShareRow) =>
    buildShareLink(appUrl, { key: fromB64url(r.keyB64), exp: r.exp, hasPassword: !!r.password })
  const messageFor = (r: ShareRow) =>
    formatShareMessage({
      link: linkFor(r),
      password: r.password,
      expiresAt: r.expiresAt,
      now: now(),
    })

  /** Answer one recipient (spec §5.4.6): stopped → expired → cool-down → token → share. */
  const answer = async (id: string, readToken: string): Promise<Reply> => {
    if (serving.get(id)?.tombstone) return { type: 'stopped' }
    const row = await getShare(db, id)
    if (!row || row.stopped) return { type: 'stopped' }
    const t = now()
    if (t >= row.expiresAt) return { type: 'expired' }
    if (t < row.coolDownUntil) return { type: 'wait', retryInMs: row.coolDownUntil - t }
    let ok: boolean
    try {
      const hash = await sha256Hex(fromB64url(readToken))
      ok = timingSafeEqual(
        new TextEncoder().encode(hash),
        new TextEncoder().encode(row.readTokenHash),
      )
    } catch {
      ok = false
    }
    if (!ok) {
      const failures = row.failures + 1
      const patch: Partial<ShareRow> =
        failures >= MAX_FAILURES
          ? { failures: 0, coolDownUntil: t + row.coolDownMs, coolDownMs: row.coolDownMs * 2 }
          : { failures }
      await updateShare(db, id, patch)
      return { type: 'denied' }
    }
    await updateShare(db, id, { opens: row.opens + 1, lastOpenedAt: t })
    void refresh()
    return { type: 'share', iv: row.iv, ciphertext: row.ciphertext }
  }

  const onConn = (id: string) => (conn: Conn) => {
    let answered = false
    conn.onMessage((m) => {
      if (answered || !isHello(m)) return
      answered = true
      void answer(id, m.readToken).then((reply) => conn.send(reply))
    })
  }

  const endServing = (id: string) => {
    const s = serving.get(id)
    if (!s) return
    clearTimeout(s.timer)
    s.host?.stop()
    s.release()
    serving.delete(id)
  }

  const expire = async (id: string) => {
    endServing(id)
    await deleteShare(db, id)
    await refresh()
  }

  /**
   * Serve a share while holding its lock. Resolves once registered (or immediately if another
   * window holds the lock — we then take over automatically when it lets go).
   */
  const serve = (row: ShareRow): Promise<void> =>
    new Promise<void>((resolve, reject) => {
      let release!: () => void
      const held = new Promise<void>((r) => (release = r))
      let started = false
      const entry: Serving = { host: null, release, timer: undefined, tombstone: false }
      // Register before asking for the lock: some lock managers run the callback synchronously.
      serving.set(row.id, entry)
      void locks
        .request(`share:${row.id}`, { mode: 'exclusive' }, async () => {
          if (disposed || serving.get(row.id) !== entry) return
          started = true
          try {
            entry.host = await transport.host(row.peerId, onConn(row.id))
          } catch (e) {
            serving.delete(row.id)
            reject(e)
            return
          }
          entry.timer = setTimeout(() => void expire(row.id), Math.max(0, row.expiresAt - now()))
          resolve()
          await held
        })
        .catch(reject)
      // Lock busy elsewhere: we're queued; report success to the caller right away.
      queueMicrotask(() => {
        if (!started) resolve()
      })
    })

  return {
    async create(note, opts) {
      if (opts.password !== null && !isPasswordValid(opts.password))
        throw new ShareError('invalid-password', 'Password must be at least 8 characters.')
      const packed = await packSnapshot(note)
      if (packed.length > MAX_SNAPSHOT_BYTES)
        throw new ShareError('too-large', 'This note is too large to share (5 MB max).')
      const key = crypto.getRandomValues(new Uint8Array(32))
      const exp = Math.ceil((now() + opts.expiresInMs) / 1000)
      const secrets = await deriveSecrets(key, exp, opts.password)
      const { iv, ciphertext } = await encryptSnapshot(secrets, packed)
      const row: ShareRow = {
        id: crypto.randomUUID(),
        noteId: note.id,
        title: note.title ?? '',
        keyB64: toB64url(key),
        exp,
        peerId: secrets.peerId,
        readTokenHash: await sha256Hex(secrets.readToken),
        password: opts.password,
        iv: toB64url(iv),
        ciphertext: toB64url(ciphertext),
        createdAt: now(),
        expiresAt: exp * 1000,
        opens: 0,
        lastOpenedAt: null,
        failures: 0,
        coolDownUntil: 0,
        coolDownMs: COOL_DOWN_START_MS,
        stopped: false,
      }
      await putShare(db, row)
      try {
        await serve(row)
      } catch {
        await deleteShare(db, row.id)
        throw new ShareError(
          'unavailable',
          'Couldn’t reach the sharing service. Check your connection and try again.',
        )
      }
      await refresh()
      return {
        id: row.id,
        link: linkFor(row),
        password: row.password,
        expiresAt: row.expiresAt,
        message: messageFor(row),
      }
    },

    async stop(id) {
      const row = await getShare(db, id)
      await deleteShare(db, id)
      const s = serving.get(id)
      if (s && row && row.expiresAt > now()) {
        // Keep answering "stopped" (holding no key or data) until the link would have expired.
        s.tombstone = true
        clearTimeout(s.timer)
        s.timer = setTimeout(() => endServing(id), row.expiresAt - now())
      } else endServing(id)
      await refresh()
    },

    async resume() {
      await purgeEndedShares(db, now())
      const active = await listActiveShares(db, now())
      await Promise.all(
        active.filter((r) => !serving.has(r.id)).map((r) => serve(r).catch(() => undefined)),
      )
      await refresh()
    },

    refresh,

    stopServing(id) {
      endServing(id)
      void refresh()
    },

    active: () => rows,
    linkFor,
    messageFor,

    subscribe(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },

    dispose() {
      disposed = true
      for (const id of [...serving.keys()]) endServing(id)
      listeners.clear()
    },
  }
}
