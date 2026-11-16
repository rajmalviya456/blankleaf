import { createChannelTransport } from './channelTransport'
import { createPeerTransport } from './peerTransport'
import type { ShareTransport } from './transport'

export const TRANSPORT_FLAG = 'notepadz:share-transport'

/**
 * PeerJS normally. End-to-end tests set localStorage[TRANSPORT_FLAG] = 'channel' to keep
 * sharing inside the browser (two tabs, no network). Harmless if set by anyone else:
 * it only makes sharing local to this browser.
 */
export function pickTransport(): ShareTransport {
  let flag: string | null = null
  try {
    flag = localStorage.getItem(TRANSPORT_FLAG)
  } catch {
    // storage unavailable: use the default
  }
  return flag === 'channel' ? createChannelTransport() : createPeerTransport()
}
