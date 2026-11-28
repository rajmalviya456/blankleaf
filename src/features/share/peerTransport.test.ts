import { createPeerTransport } from './peerTransport'

// A stand-in for PeerJS: a peer registers at once and a connection opens at once.
const peerjs = vi.hoisted(() => {
  type Cb = (...args: unknown[]) => void
  class Emitter {
    private cbs = new Map<string, Cb[]>()
    on(ev: string, cb: Cb) {
      this.cbs.set(ev, [...(this.cbs.get(ev) ?? []), cb])
      return this
    }
    once(ev: string, cb: Cb) {
      const wrapped: Cb = (...a) => {
        this.cbs.set(
          ev,
          (this.cbs.get(ev) ?? []).filter((c) => c !== wrapped),
        )
        cb(...a)
      }
      return this.on(ev, wrapped)
    }
    emit(ev: string, ...a: unknown[]) {
      for (const cb of this.cbs.get(ev) ?? []) cb(...a)
    }
  }
  class Connection extends Emitter {
    open = false
    send() {}
    close() {
      this.open = false
      this.emit('close')
    }
  }
  class Peer extends Emitter {
    destroyed = false
    constructor() {
      super()
      queueMicrotask(() => this.emit('open'))
    }
    connect() {
      const dc = new Connection()
      queueMicrotask(() => {
        dc.open = true
        dc.emit('open')
      })
      return dc
    }
    destroy() {
      this.destroyed = true
    }
  }
  return { Peer, loads: 0 }
})

vi.mock('peerjs', () => {
  peerjs.loads++
  // The first download fails, as it can on a flaky phone connection.
  if (peerjs.loads === 1) throw new TypeError('Failed to fetch dynamically imported module')
  return { Peer: peerjs.Peer }
})

describe('peer transport', () => {
  it('loads PeerJS again after a failed download, so "Try again" can work', async () => {
    const t = createPeerTransport()
    await expect(t.connect('sender-peer')).rejects.toThrow()
    const conn = await t.connect('sender-peer')
    expect(peerjs.loads).toBe(2)
    expect(conn.send).toBeTypeOf('function')
  })
})
