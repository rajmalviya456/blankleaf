import { ConnHandlers, TransportError, type Conn, type ShareTransport } from './transport'

type Envelope =
  | { k: 'probe'; peerId: string; probe: string }
  | { k: 'taken'; probe: string }
  | { k: 'open'; peerId: string; connId: string }
  | { k: 'accept'; connId: string }
  | { k: 'msg'; connId: string; to: 'host' | 'client'; payload: unknown }
  | { k: 'close'; connId: string }

/**
 * BroadcastChannel transport: lets two tabs of the same origin talk without a network.
 * Used for end-to-end tests (enabled with a localStorage flag, see pickTransport).
 */
export function createChannelTransport(name = 'blankleaf-share-test'): ShareTransport {
  const ch = new BroadcastChannel(name)
  const hosted = new Map<string, { onConn: (c: Conn) => void; conns: Map<string, ConnHandlers> }>()
  const clients = new Map<string, ConnHandlers>()
  const waiters = new Map<string, () => void>()
  const post = (e: Envelope) => ch.postMessage(e)

  const makeConn = (connId: string, h: ConnHandlers, to: 'host' | 'client'): Conn => ({
    send: (payload) => {
      if (!h.closed) post({ k: 'msg', connId, to, payload })
    },
    onMessage: h.onMessage,
    onClose: h.onClose,
    close: () => {
      post({ k: 'close', connId })
      h.fireClose()
    },
  })

  ch.onmessage = (ev: MessageEvent<Envelope>) => {
    const e = ev.data
    switch (e.k) {
      case 'probe':
        if (hosted.has(e.peerId)) post({ k: 'taken', probe: e.probe })
        break
      case 'taken':
        waiters.get(e.probe)?.()
        break
      case 'open': {
        const host = hosted.get(e.peerId)
        if (!host) break
        const h = new ConnHandlers()
        host.conns.set(e.connId, h)
        post({ k: 'accept', connId: e.connId })
        host.onConn(makeConn(e.connId, h, 'client'))
        break
      }
      case 'accept':
        waiters.get(e.connId)?.()
        break
      case 'msg': {
        if (e.to === 'client') clients.get(e.connId)?.deliver(e.payload)
        else for (const host of hosted.values()) host.conns.get(e.connId)?.deliver(e.payload)
        break
      }
      case 'close':
        clients.get(e.connId)?.fireClose()
        for (const host of hosted.values()) host.conns.get(e.connId)?.fireClose()
        break
    }
  }

  const waitFor = (id: string, ms: number) =>
    new Promise<boolean>((resolve) => {
      const t = setTimeout(() => {
        waiters.delete(id)
        resolve(false)
      }, ms)
      waiters.set(id, () => {
        clearTimeout(t)
        waiters.delete(id)
        resolve(true)
      })
    })

  return {
    async host(peerId, onConn) {
      if (hosted.has(peerId)) throw new TransportError('taken')
      const probe = crypto.randomUUID()
      const answered = waitFor(probe, 100)
      post({ k: 'probe', peerId, probe })
      if (await answered) throw new TransportError('taken')
      const entry = { onConn, conns: new Map<string, ConnHandlers>() }
      hosted.set(peerId, entry)
      return {
        stop() {
          if (hosted.get(peerId) !== entry) return
          hosted.delete(peerId)
          for (const [connId, h] of entry.conns) {
            post({ k: 'close', connId })
            h.fireClose()
          }
        },
      }
    },
    async connect(peerId, timeoutMs = 3000) {
      const connId = crypto.randomUUID()
      const h = new ConnHandlers()
      clients.set(connId, h)
      const accepted = waitFor(connId, timeoutMs)
      post({ k: 'open', peerId, connId })
      if (!(await accepted)) {
        clients.delete(connId)
        throw new TransportError('offline')
      }
      return makeConn(connId, h, 'host')
    },
  }
}
