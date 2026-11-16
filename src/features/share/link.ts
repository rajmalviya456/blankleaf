import { fromB64url, toB64url } from './b64'

export const SHARE_HASH_PREFIX = '#/s/'
const KEY_BYTES = 32

export interface ShareLinkParts {
  /** Random 32-byte link key. */
  key: Uint8Array
  /** Expiry, seconds since the epoch. */
  exp: number
  hasPassword: boolean
}

/** `<appUrl>#/s/<base64url key>.<exp base36>.<p|n>` — everything after # stays in the browser. */
export function buildShareLink(appUrl: string, parts: ShareLinkParts): string {
  const base = appUrl.split('#')[0]
  return `${base}${SHARE_HASH_PREFIX}${toB64url(parts.key)}.${parts.exp.toString(36)}.${parts.hasPassword ? 'p' : 'n'}`
}

export function parseShareHash(hash: string): ShareLinkParts | null {
  if (!hash.startsWith(SHARE_HASH_PREFIX)) return null
  const segments = hash.slice(SHARE_HASH_PREFIX.length).split('.')
  if (segments.length !== 3) return null
  const [k, e, flag] = segments
  if (flag !== 'p' && flag !== 'n') return null
  if (!/^[0-9a-z]{1,12}$/.test(e)) return null
  let key: Uint8Array
  try {
    key = fromB64url(k)
  } catch {
    return null
  }
  if (key.length !== KEY_BYTES) return null
  const exp = parseInt(e, 36)
  if (!Number.isSafeInteger(exp) || exp <= 0) return null
  return { key, exp, hasPassword: flag === 'p' }
}
