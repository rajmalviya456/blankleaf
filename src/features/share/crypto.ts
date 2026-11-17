/**
 * Share crypto (spec §5.4). Everything uses WebCrypto; nothing here touches the network.
 *
 *   K (32 random bytes, in the link)
 *   ├─ HKDF "peer" → peerId   (who to connect to; needs only K)
 *   ├─ HKDF "salt" → salt     (for PBKDF2; the recipient has it before connecting)
 *   └─ with password: pw = PBKDF2(normalised password, salt, 600k)
 *        HKDF(K ‖ pw) "read" → readToken (proof sent to the sender)
 *        HKDF(K ‖ pw) "enc"  → AES-256-GCM key
 *
 * exp and the password flag are bound into every derivation and into the AAD, so a link with an
 * edited expiry derives different ids/keys and simply doesn't work.
 */
import { LANGUAGES } from '../../domain/languages'
import type { LanguageId, Note, NoteMode } from '../../domain/types'
import { normalizePassword } from './password'

export const PBKDF2_ITERATIONS = 600_000
let pbkdf2Iterations = PBKDF2_ITERATIONS

/** Test-only: PBKDF2 at 600k is slow in jsdom. Never called by app code. */
export function __setPbkdf2Iterations(n: number): void {
  pbkdf2Iterations = n
}

export interface Snapshot {
  v: 1
  title: string
  language: LanguageId
  mode: NoteMode
  content: string
}

export interface Secrets {
  peerId: string
  readToken: Uint8Array
  encKey: CryptoKey
  aad: Uint8Array
}

const enc = new TextEncoder()
const dec = new TextDecoder()
const subtle = () => globalThis.crypto.subtle

/** Copy into a fresh ArrayBuffer-backed view (WebCrypto rejects views from other realms). */
const buf = (b: Uint8Array): Uint8Array<ArrayBuffer> => new Uint8Array(b)

function concat(...parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

const BASE32 = 'abcdefghijklmnopqrstuvwxyz234567'
function base32(bytes: Uint8Array): string {
  let bits = 0
  let value = 0
  let out = ''
  for (const b of bytes) {
    value = (value << 8) | b
    bits += 8
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31]
  return out
}

async function hkdf(
  ikm: Uint8Array,
  info: string,
  bytes: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const base = await subtle().importKey('raw', buf(ikm), 'HKDF', false, ['deriveBits'])
  const bits = await subtle().deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: enc.encode(info) },
    base,
    bytes * 8,
  )
  return new Uint8Array(bits)
}

async function pbkdf2(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const base = await subtle().importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await subtle().deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: buf(salt), iterations: pbkdf2Iterations },
    base,
    256,
  )
  return new Uint8Array(bits)
}

export async function deriveSecrets(
  key: Uint8Array,
  exp: number,
  password: string | null,
): Promise<Secrets> {
  const flag = password ? 'p' : 'n'
  const info = (what: string) => `notepadz-share-v1|${what}|${exp}|${flag}`
  const peerId = 'npz-' + base32(await hkdf(key, info('peer'), 16))
  let ikm: Uint8Array = key
  if (password) {
    const salt = await hkdf(key, info('salt'), 16)
    ikm = concat(key, await pbkdf2(normalizePassword(password), salt))
  }
  const readToken = await hkdf(ikm, info('read'), 16)
  const keyBytes = await hkdf(ikm, info('enc'), 32)
  const encKey = await subtle().importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt'])
  return { peerId, readToken, encKey, aad: enc.encode(`notepadz-share-v1|${exp}|${flag}`) }
}

async function pipe(bytes: Uint8Array, stream: GenericTransformStream): Promise<Uint8Array> {
  const source = new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(buf(bytes))
      c.close()
    },
  })
  const reader = (source.pipeThrough(stream) as ReadableStream<Uint8Array>).getReader()
  const chunks: Uint8Array[] = []
  for (let r = await reader.read(); !r.done; r = await reader.read()) chunks.push(r.value)
  return concat(...chunks)
}

/** deflate-raw (exported for tests). */
export const deflate = (bytes: Uint8Array) => pipe(bytes, new CompressionStream('deflate-raw'))
const inflate = (bytes: Uint8Array) => pipe(bytes, new DecompressionStream('deflate-raw'))

export async function packSnapshot(note: Note): Promise<Uint8Array> {
  const snap: Snapshot = {
    v: 1,
    title: note.title ?? '',
    language: note.language,
    mode: note.mode,
    content: note.content,
  }
  return deflate(enc.encode(JSON.stringify(snap)))
}

const LANGUAGE_IDS = new Set<string>(['auto', ...LANGUAGES.map((l) => l.id)])

export async function unpackSnapshot(bytes: Uint8Array): Promise<Snapshot> {
  const json = JSON.parse(dec.decode(await inflate(bytes)))
  if (
    !json ||
    json.v !== 1 ||
    typeof json.title !== 'string' ||
    typeof json.content !== 'string' ||
    !LANGUAGE_IDS.has(json.language) ||
    (json.mode !== 'plain' && json.mode !== 'markdown')
  )
    throw new Error('not a Notepadz share')
  return {
    v: 1,
    title: json.title,
    language: json.language,
    mode: json.mode,
    content: json.content,
  }
}

export async function encryptSnapshot(
  s: Secrets,
  packed: Uint8Array,
): Promise<{ iv: Uint8Array; ciphertext: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await subtle().encrypt(
    { name: 'AES-GCM', iv, additionalData: buf(s.aad) },
    s.encKey,
    buf(packed),
  )
  return { iv, ciphertext: new Uint8Array(ct) }
}

/** Throws if the key/password is wrong or the data was tampered with (GCM authentication). */
export async function decryptSnapshot(
  s: Secrets,
  iv: Uint8Array,
  ciphertext: Uint8Array,
): Promise<Uint8Array> {
  const pt = await subtle().decrypt(
    { name: 'AES-GCM', iv: buf(iv), additionalData: buf(s.aad) },
    s.encKey,
    buf(ciphertext),
  )
  return new Uint8Array(pt)
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const h = new Uint8Array(await subtle().digest('SHA-256', buf(bytes)))
  return Array.from(h, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Constant-time comparison for tokens. */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}
