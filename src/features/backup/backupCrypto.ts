/**
 * Encrypted backup files: the whole backup is compressed, then encrypted with AES-256-GCM using
 * a key derived from the backup password by PBKDF2-SHA-256 (as locked notes are). The file says
 * only that it's an encrypted Blankleaf backup; notes, titles and settings are all inside.
 */
import {
  deriveKey,
  fromB64,
  passwordIterations,
  toB64,
  toB64Long,
  WrongPasswordError,
} from '../lock/lockCrypto'

/** A backup password's key. This device keeps it so automatic backups stay encrypted. */
export interface BackupKey {
  key: CryptoKey
  salt: string
  iterations: number
}

interface EncryptedFile {
  app: 'blankleaf'
  encrypted: { v: 1; salt: string; iterations: number; iv: string; gzip: boolean; data: string }
}

const AAD = new TextEncoder().encode('blankleaf-backup-v1')
/** A changed file could ask for any number of rounds: more than this would freeze the tab. */
const MAX_ITERATIONS = 5_000_000

export async function newBackupKey(password: string): Promise<BackupKey> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iterations = passwordIterations()
  return { key: await deriveKey(password, salt, iterations), salt: toB64(salt), iterations }
}

const canZip = () => typeof CompressionStream !== 'undefined'

async function through(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const out = new Response(bytes as BodyInit).body!.pipeThrough(stream)
  return new Uint8Array(await new Response(out).arrayBuffer())
}

export function isEncryptedBackup(text: string): boolean {
  if (!/"encrypted"\s*:/.test(text.slice(0, 200))) return false
  try {
    const f = JSON.parse(text) as Partial<EncryptedFile>
    return f.app === 'blankleaf' && typeof f.encrypted?.data === 'string'
  } catch {
    return false
  }
}

export async function encryptBackup(text: string, k: BackupKey): Promise<string> {
  const raw = new TextEncoder().encode(text)
  const gzip = canZip()
  const body = gzip ? await through(raw, new CompressionStream('gzip')) : raw
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource, additionalData: AAD },
    k.key,
    body as BufferSource,
  )
  const file: EncryptedFile = {
    app: 'blankleaf',
    encrypted: {
      v: 1,
      salt: k.salt,
      iterations: k.iterations,
      iv: toB64(iv),
      gzip,
      data: toB64Long(new Uint8Array(data)),
    },
  }
  return JSON.stringify(file)
}

/** The salt a backup was encrypted with: the same as this device's key means it can open it. */
export function backupSalt(text: string): string | null {
  try {
    return (JSON.parse(text) as EncryptedFile).encrypted.salt
  } catch {
    return null
  }
}

/** The backup's plain text. Throws WrongPasswordError for a wrong password or a changed file. */
export async function decryptBackup(text: string, with_: string | BackupKey): Promise<string> {
  let e: EncryptedFile['encrypted']
  try {
    e = (JSON.parse(text) as EncryptedFile).encrypted
  } catch {
    throw new WrongPasswordError('Not an encrypted backup')
  }
  if (!Number.isInteger(e?.iterations) || e.iterations < 1 || e.iterations > MAX_ITERATIONS)
    throw new WrongPasswordError('This backup is damaged')
  let key: CryptoKey
  if (typeof with_ === 'string') key = await deriveKey(with_, fromB64(e.salt), e.iterations)
  else if (with_.salt !== e.salt) throw new WrongPasswordError('Made with another password')
  else key = with_.key
  let body: Uint8Array
  try {
    body = new Uint8Array(
      await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: fromB64(e.iv) as BufferSource, additionalData: AAD },
        key,
        fromB64(e.data) as BufferSource,
      ),
    )
  } catch {
    throw new WrongPasswordError('Wrong password')
  }
  const raw = e.gzip ? await through(body, new DecompressionStream('gzip')) : body
  return new TextDecoder().decode(raw)
}
