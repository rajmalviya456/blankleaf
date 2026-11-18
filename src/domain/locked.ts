/** Validates locked-note data from untrusted files. Encryption lives in features/lock. */
import type { LockedContent } from './types'

/** Title of a locked note that had no chosen title: its first line must not stay readable. */
export const LOCKED_TITLE = 'Locked note'

const B64 = /^[A-Za-z0-9+/]+={0,2}$/
const isB64 = (v: unknown): v is string => typeof v === 'string' && B64.test(v)

/** The note's encrypted text, or undefined if this isn't valid locked content. */
export function cleanLocked(raw: unknown): LockedContent | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const { v, salt, iv, data, iterations, origin } = raw as Record<string, unknown>
  if (v !== 1 || !isB64(salt) || !isB64(iv) || !isB64(data)) return undefined
  // A hostile file could otherwise freeze the tab with an absurd iteration count.
  if (typeof iterations !== 'number' || !Number.isInteger(iterations)) return undefined
  if (iterations < 1000 || iterations > 5_000_000) return undefined
  if (typeof origin !== 'string' || !origin || origin.length > 200) return undefined
  return { v, salt, iv, data, iterations, origin }
}
