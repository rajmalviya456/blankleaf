import { ConnHandlers, TransportError, type Conn, type ShareTransport } from './transport'

/** In-process transport for tests: one registry per factory call. */
export function createMemoryTransport(): ShareTransport {
  const hosts = new Map<string, { onConn: (c: Conn) => void; conns: Set<() => void> }>()

  const pair = (): [Conn, Conn, () => void] => {
    const a = new ConnHandlers()
    const b = new ConnHandlers()
    const closeBoth = () => {
      a.fireClose()
      b.fireClose()
    }
    const side = (self: ConnHandlers, other: ConnHandlers): Conn => ({
      send: (m) => {
        if (self.closed) return
        const copy = JSON.parse(JSON.stringify(m))
        queueMicrotask(() => other.deliver(copy))
      },
      onMessage: self.onMessage,
      onClose: self.onClose,
      close: () => queueMicrotask(closeBoth),
    })
    return [side(a, b), side(b, a), closeBoth]
  }

  return {
    async host(peerId, onConn) {
      if (hosts.has(peerId)) throw new TransportError('taken')
      const entry = { onConn, conns: new Set<() => void>() }
      hosts.set(peerId, entry)
      return {
        stop() {
          if (hosts.get(peerId) !== entry) return
          hosts.delete(peerId)
          entry.conns.forEach((close) => close())
        },
      }
    },
    async connect(peerId) {
      await Promise.resolve()
      const entry = hosts.get(peerId)
      if (!entry) throw new TransportError('offline')
      const [client, server, close] = pair()
      entry.conns.add(close)
      entry.onConn(server)
      return client
    },
  }
}
