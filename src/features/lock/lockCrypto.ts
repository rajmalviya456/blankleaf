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

/** The encrypted data is tied to its note, so it can't be swapped onto another one. */
const params = (iv: Uint8Array, noteId: string): AesGcmParams => ({
  name: 'AES-GCM',
  iv: iv as BufferSource,
  additionalData: new TextEncoder().encode(`blankleaf-lock-v1|${noteId}`),
})

export async function newLockKey(password: string): Promise<LockKey> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return { key: await deriveKey(password, salt, iterations), salt: toB64(salt), iterations }
}

export async function seal(lock: LockKey, noteId: string, text: string): Promise<LockedContent> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = await crypto.subtle.encrypt(
    params(iv, noteId),
    lock.key,
    new TextEncoder().encode(text),
  )
  return {
    v: 1,
    salt: lock.salt,
    iv: toB64(iv),
    data: toB64Long(new Uint8Array(data)),
    iterations: lock.iterations,
  }
}

/** Decrypt a note. Throws WrongPasswordError if the password is wrong or the data was altered. */
export async function unseal(
  password: string,
  noteId: string,
  locked: LockedContent,
): Promise<{ text: string; lock: LockKey }> {
  const key = await deriveKey(password, fromB64(locked.salt), locked.iterations)
  try {
    const plain = await crypto.subtle.decrypt(
      params(fromB64(locked.iv), noteId),
      key,
      fromB64(locked.data) as BufferSource,
    )
    return {
      text: new TextDecoder().decode(plain),
      lock: { key, salt: locked.salt, iterations: locked.iterations },
    }
  } catch {
    throw new WrongPasswordError('Wrong password')
  }
}
