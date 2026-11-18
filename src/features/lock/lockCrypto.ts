/**
 * Password-locked notes: AES-256-GCM with a key derived from the password by PBKDF2-SHA-256.
 * The password and key are never stored. Without the password the text can't be recovered.
 */
import type { LockedContent } from '../../domain/types'

export const LOCK_ITERATIONS = 600_000
let iterations = LOCK_ITERATIONS
/** Tests only: PBKDF2 is deliberately slow. */
export const __setLockIterations = (n: number) => void (iterations = n)

export class WrongPasswordError extends Error {}

/** An unlocked note's key, held in memory only while the note is open. */
export interface LockKey {
  key: CryptoKey
  salt: string
  iterations: number
  origin: string
}

const toB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
function toB64Long(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 0x8000)
    out += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(out)
}

async function deriveKey(password: string, salt: Uint8Array, rounds: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password.normalize('NFC')),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: rounds },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/** Everything stored beside the text is authenticated with it. */
const params = (iv: Uint8Array, origin: string): AesGcmParams => ({
  name: 'AES-GCM',
  iv: iv as BufferSource,
  additionalData: new TextEncoder().encode(`blankleaf-lock-v1|${origin}`),
})

export async function newLockKey(password: string, origin: string): Promise<LockKey> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return { key: await deriveKey(password, salt, iterations), salt: toB64(salt), iterations, origin }
}

export async function seal(lock: LockKey, text: string): Promise<LockedContent> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = await crypto.subtle.encrypt(
    params(iv, lock.origin),
    lock.key,
    new TextEncoder().encode(text),
  )
  return {
    v: 1,
    salt: lock.salt,
    iv: toB64(iv),
    data: toB64Long(new Uint8Array(data)),
    iterations: lock.iterations,
    origin: lock.origin,
  }
}

async function decrypt(key: CryptoKey, locked: LockedContent): Promise<string> {
  try {
    const plain = await crypto.subtle.decrypt(
      params(fromB64(locked.iv), locked.origin),
      key,
      fromB64(locked.data) as BufferSource,
    )
    return new TextDecoder().decode(plain)
  } catch {
    throw new WrongPasswordError('Wrong password')
  }
}

/** Decrypt a note. Throws WrongPasswordError if the password is wrong or the data was altered. */
export async function unseal(
  password: string,
  locked: LockedContent,
): Promise<{ text: string; lock: LockKey }> {
  const key = await deriveKey(password, fromB64(locked.salt), locked.iterations)
  return {
    text: await decrypt(key, locked),
    lock: { key, salt: locked.salt, iterations: locked.iterations, origin: locked.origin },
  }
}

/** Decrypt a newer copy of an already unlocked note (saved by another window). */
export const unsealWith = (lock: LockKey, locked: LockedContent) => decrypt(lock.key, locked)
