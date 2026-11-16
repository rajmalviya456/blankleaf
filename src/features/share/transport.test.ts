import { createChannelTransport } from './channelTransport'
import { createMemoryTransport } from './memoryTransport'
import { isHello, isReply } from './protocol'
import type { Conn, ShareTransport } from './transport'

const next = (c: Conn) => new Promise<unknown>((resolve) => c.onMessage(resolve))

describe.each([
  [
    'memory',
    () => {
      const t = createMemoryTransport()
      return [t, t] as const
    },
  ],
  [
    'channel',
    () => {
      const name = `t-${Math.random()}`
      return [createChannelTransport(name), createChannelTransport(name)] as const
    },
  ],
])('%s transport', (_label, make: () => readonly [ShareTransport, ShareTransport]) => {
  it('host and connect exchange messages', async () => {
    const [a, b] = make()
    const host = await a.host('peer-1', (conn) => {
      conn.onMessage((m) => {
        if (isHello(m)) conn.send({ type: 'denied' })
      })
    })
    const c = await b.connect('peer-1', 500)
    const reply = next(c)
    c.send({ type: 'hello', v: 1, readToken: 'abc' })
    expect(await reply).toEqual({ type: 'denied' })
    c.close()
    host.stop()
  })

  it('connect to an unknown id rejects offline', async () => {
    const [, b] = make()
    await expect(b.connect('nobody', 200)).rejects.toMatchObject({ kind: 'offline' })
  })

  it('hosting an id twice rejects taken', async () => {
    const [a, b] = make()
    const host = await a.host('peer-2', () => {})
    await expect(b.host('peer-2', () => {})).rejects.toMatchObject({ kind: 'taken' })
    host.stop()
  })

  it('host.stop closes connections and frees the id', async () => {
    const [a, b] = make()
    const host = await a.host('peer-3', () => {})
    const c = await b.connect('peer-3', 500)
    const closed = new Promise<void>((resolve) => c.onClose(resolve))
    host.stop()
    await closed
    await expect(b.connect('peer-3', 200)).rejects.toMatchObject({ kind: 'offline' })
    const again = await a.host('peer-3', () => {})
    again.stop()
  })
})

describe('protocol guards', () => {
  it('recognise valid messages only', () => {
    expect(isHello({ type: 'hello', v: 1, readToken: 'x' })).toBe(true)
    expect(isHello({ type: 'hello', v: 2, readToken: 'x' })).toBe(false)
    expect(isReply({ type: 'share', iv: 'a', ciphertext: 'b' })).toBe(true)
    expect(isReply({ type: 'wait', retryInMs: 5 })).toBe(true)
    expect(isReply({ type: 'wait' })).toBe(false)
    expect(isReply({ type: 'nope' })).toBe(false)
    expect(isReply(null)).toBe(false)
  })
})
