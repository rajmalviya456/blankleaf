/**
 * Production transport: WebRTC data channels via PeerJS's free public signaling server.
 * The signaling server only introduces the two browsers (peer ids, IPs); every message
 * travels directly between them over an encrypted data channel.
 */
import type { DataConnection, Peer as PeerType } from 'peerjs'
import { ConnHandlers, TransportError, type Conn, type ShareTransport } from './transport'

type PeerCtor = typeof PeerType

let peerCtor: Promise<PeerCtor> | null = null
const loadPeer = () => (peerCtor ??= import('peerjs').then((m) => m.Peer))

function errorKind(type: string | undefined): TransportError['kind'] {
  switch (type) {
    case 'peer-unavailable':
      return 'offline'
    case 'unavailable-id':
      return 'taken'
    case 'webrtc':
    case 'negotiation-failed':
      return 'blocked'
    default:
      return 'unavailable'
  }
}

function wrap(dc: DataConnection): Conn {
  const h = new ConnHandlers()
  dc.on('data', (d) => h.deliver(d))
  dc.on('close', () => h.fireClose())
  dc.on('error', () => h.fireClose())
  dc.on('iceStateChanged', (s) => {
    if (s === 'failed' || s === 'disconnected' || s === 'closed') h.fireClose()
  })
  return {
    send: (m) => {
      if (dc.open) void dc.send(m)
    },
    onMessage: h.onMessage,
    onClose: h.onClose,
    close: () => dc.close(),
  }
}

/** Wait for a fresh Peer to register with the signaling server. */
function opened(peer: PeerType): Promise<void> {
  return new Promise((resolve, reject) => {
    peer.once('open', () => resolve())
    peer.once('error', (e) => reject(new TransportError(errorKind(e.type), e.message)))
  })
}

export function createPeerTransport(): ShareTransport {
  return {
    async host(peerId, onConn) {
      const Peer = await loadPeer()
      const peer = new Peer(peerId)
      try {
        await opened(peer)
      } catch (e) {
        peer.destroy()
        throw e
      }
      peer.on('connection', (dc) => dc.on('open', () => onConn(wrap(dc))))
      // Keep the registration alive if the signaling socket drops, backing off (1s → 60s)
      // so an offline laptop doesn't hammer the signaling server.
      let backoff = 1000
      let retry: ReturnType<typeof setTimeout> | undefined
      peer.on('open', () => (backoff = 1000))
      peer.on('disconnected', () => {
        clearTimeout(retry)
        retry = setTimeout(() => {
          if (!peer.destroyed) peer.reconnect()
        }, backoff)
        backoff = Math.min(backoff * 2, 60_000)
      })
      return {
        stop: () => {
          clearTimeout(retry)
          peer.destroy()
        },
      }
    },

    async connect(peerId, timeoutMs = 15_000) {
      const Peer = await loadPeer()
      const peer = new Peer()
      try {
        await opened(peer)
      } catch (e) {
        peer.destroy()
        throw e
      }
      return new Promise<Conn>((resolve, reject) => {
        let done = false
        const fail = (kind: TransportError['kind']) => {
          if (done) return
          done = true
          clearTimeout(timer)
          peer.destroy()
          reject(new TransportError(kind))
        }
        // No answer in time: the sender is offline or a firewall blocked the connection.
        const timer = setTimeout(() => fail(iceStarted ? 'blocked' : 'offline'), timeoutMs)
        let iceStarted = false
        peer.on('error', (e) => fail(errorKind(e.type)))
        const dc = peer.connect(peerId, { reliable: true })
        dc.on('iceStateChanged', (s) => {
          iceStarted = true
          if (s === 'failed') fail('blocked')
        })
        dc.on('open', () => {
          if (done) return
          done = true
          clearTimeout(timer)
          const conn = wrap(dc)
          conn.onClose(() => peer.destroy())
          resolve(conn)
        })
      })
    },
  }
}
