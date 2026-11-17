/**
 * Recipient side of link sharing (spec §5.3). Pure state machine; ShareView renders it.
 *
 *   expired ← (link's expiry passed)            need-password → connecting
 *   connecting → ready | wrong-password | cooldown | stopped | expired | corrupt
 *              → waiting (sender offline; retries until expiry) | blocked | unavailable
 */
import { fromB64url, toB64url } from './b64'
import {
  decryptSnapshot,
  deriveSecrets,
  unpackSnapshot,
  type Secrets,
  type Snapshot,
} from './crypto'
import type { ShareLinkParts } from './link'
import { isReply, type Reply } from './protocol'
import { TransportError, type Conn, type ShareTransport } from './transport'

export type ReceiveState =
  | { s: 'expired' }
  | { s: 'need-password' }
  | { s: 'connecting' }
  | { s: 'waiting'; expiresAt: number }
  | { s: 'wrong-password' }
  | { s: 'cooldown'; retryAt: number }
  | { s: 'stopped' }
  | { s: 'blocked' }
  | { s: 'unavailable' }
  | { s: 'corrupt' }
  | { s: 'ready'; snapshot: Snapshot; expiresAt: number }

export interface Receiver {
  state(): ReceiveState
  subscribe(cb: () => void): () => void
  submitPassword(pw: string): void
  retry(): void
  dispose(): void
}

export function createReceiver(o: {
  parts: ShareLinkParts
  transport: ShareTransport
  now?: () => number
  /** How often to retry while the sender is offline. */
  retryMs?: number
  connectTimeoutMs?: number
  /** Treat a sender that connects but never answers as offline after this long. */
  replyTimeoutMs?: number
}): Receiver {
  const { parts, transport } = o
  const now = o.now ?? Date.now
  const retryMs = o.retryMs ?? 4000
  const expiresAt = parts.exp * 1000
  const listeners = new Set<() => void>()
  let state: ReceiveState
  let secrets: Secrets | null = null
  let conn: Conn | null = null
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  let disposed = false
  let attemptId = 0

  const set = (s: ReceiveState) => {
    if (disposed) return
    state = s
    listeners.forEach((cb) => cb())
  }
  const isExpired = () => now() >= expiresAt

  // Once the link's time is up, anything not yet received becomes "expired".
  const expiryTimer = setTimeout(
    () => {
      if (state.s !== 'ready') {
        clearTimeout(retryTimer)
        set({ s: 'expired' })
      }
    },
    Math.max(0, expiresAt - now()),
  )

  const request = (c: Conn): Promise<Reply> =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new TransportError('offline', 'no reply')),
        o.replyTimeoutMs ?? 20_000,
      )
      c.onMessage((m) => {
        if (!isReply(m)) return
        clearTimeout(timer)
        resolve(m)
      })
      c.onClose(() => {
        clearTimeout(timer)
        reject(new TransportError('offline', 'closed before replying'))
      })
      c.send({ type: 'hello', v: 1, readToken: toB64url(secrets!.readToken) })
    })

  const attempt = async () => {
    const id = ++attemptId
    clearTimeout(retryTimer)
    if (isExpired()) return set({ s: 'expired' })
    if (!secrets) return
    if (state.s !== 'waiting') set({ s: 'connecting' })
    try {
      conn?.close()
      conn = await transport.connect(secrets.peerId, o.connectTimeoutMs)
      if (id !== attemptId || disposed) return conn.close()
      const reply = await request(conn)
      conn.close()
      conn = null
      if (id !== attemptId) return
      switch (reply.type) {
        case 'share':
          try {
            const plain = await decryptSnapshot(
              secrets,
              fromB64url(reply.iv),
              fromB64url(reply.ciphertext),
            )
            set({ s: 'ready', snapshot: await unpackSnapshot(plain), expiresAt })
          } catch {
            set({ s: 'corrupt' })
          }
          return
        case 'denied':
          secrets = parts.hasPassword ? null : secrets
          return set({ s: 'wrong-password' })
        case 'wait':
          secrets = parts.hasPassword ? null : secrets
          return set({ s: 'cooldown', retryAt: now() + reply.retryInMs })
        case 'expired':
          return set({ s: 'expired' })
        case 'stopped':
          return set({ s: 'stopped' })
      }
    } catch (e) {
      if (id !== attemptId) return
      const kind = e instanceof TransportError ? e.kind : 'unavailable'
      if (kind === 'offline') {
        if (isExpired()) return set({ s: 'expired' })
        set({ s: 'waiting', expiresAt })
        retryTimer = setTimeout(() => void attempt(), retryMs)
      } else set({ s: kind === 'blocked' ? 'blocked' : 'unavailable' })
    }
  }

  const start = async (password: string | null) => {
    set({ s: 'connecting' })
    secrets = await deriveSecrets(parts.key, parts.exp, password)
    await attempt()
  }

  if (isExpired()) state = { s: 'expired' }
  else if (parts.hasPassword) state = { s: 'need-password' }
  else {
    state = { s: 'connecting' }
    void start(null)
  }

  return {
    state: () => state,
    subscribe(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    submitPassword(pw) {
      if (isExpired()) return set({ s: 'expired' })
      void start(pw)
    },
    retry() {
      if (secrets) void attempt()
      else if (!parts.hasPassword) void start(null)
      else set({ s: 'need-password' })
    },
    dispose() {
      disposed = true
      clearTimeout(retryTimer)
      clearTimeout(expiryTimer)
      conn?.close()
      listeners.clear()
    },
  }
}
