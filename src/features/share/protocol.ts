/** Messages exchanged between a recipient and the sender's browser (spec §5.4). */
export type Hello = { type: 'hello'; v: 1; readToken: string }

export type Reply =
  | { type: 'share'; iv: string; ciphertext: string }
  | { type: 'denied' }
  | { type: 'expired' }
  | { type: 'stopped' }
  | { type: 'wait'; retryInMs: number }

export type Message = Hello | Reply

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null

export function isHello(x: unknown): x is Hello {
  return isObj(x) && x.type === 'hello' && x.v === 1 && typeof x.readToken === 'string'
}

export function isReply(x: unknown): x is Reply {
  if (!isObj(x)) return false
  switch (x.type) {
    case 'share':
      return typeof x.iv === 'string' && typeof x.ciphertext === 'string'
    case 'wait':
      return typeof x.retryInMs === 'number'
    case 'denied':
    case 'expired':
    case 'stopped':
      return true
    default:
      return false
  }
}
