import type { Message } from './protocol'

/** One live connection between a recipient and the sender. */
export interface Conn {
  send(msg: Message): void
  onMessage(cb: (msg: unknown) => void): void
  onClose(cb: () => void): void
  close(): void
}

export interface Host {
  stop(): void
}

export type TransportErrorKind = 'offline' | 'blocked' | 'unavailable' | 'taken'

export class TransportError extends Error {
  readonly kind: TransportErrorKind
  constructor(kind: TransportErrorKind, message: string = kind) {
    super(message)
    this.kind = kind
  }
}

/** How share messages travel. PeerJS in production; in-memory / BroadcastChannel in tests. */
export interface ShareTransport {
  /** Register `peerId` and accept connections. Rejects 'taken' or 'unavailable'. */
  host(peerId: string, onConn: (c: Conn) => void): Promise<Host>
  /** Connect to `peerId`. Rejects 'offline', 'blocked' or 'unavailable'. */
  connect(peerId: string, timeoutMs?: number): Promise<Conn>
}

/** Small helper used by the transports: queues callbacks until they are registered. */
export class ConnHandlers {
  private msgCbs: ((m: unknown) => void)[] = []
  private closeCbs: (() => void)[] = []
  private backlog: unknown[] = []
  closed = false
  onMessage = (cb: (m: unknown) => void) => {
    this.msgCbs.push(cb)
    const queued = this.backlog.splice(0)
    for (const m of queued) cb(m)
  }
  onClose = (cb: () => void) => {
    if (this.closed) cb()
    else this.closeCbs.push(cb)
  }
  deliver(m: unknown) {
    if (this.closed) return
    if (this.msgCbs.length) this.msgCbs.forEach((cb) => cb(m))
    else this.backlog.push(m)
  }
  fireClose() {
    if (this.closed) return
    this.closed = true
    this.closeCbs.splice(0).forEach((cb) => cb())
  }
}
