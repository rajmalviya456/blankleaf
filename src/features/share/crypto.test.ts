import { DEFAULT_SETTINGS, newNoteDraft } from '../../domain/defaults'
import {
  __setPbkdf2Iterations,
  decryptSnapshot,
  deflate,
  deriveSecrets,
  encryptSnapshot,
  packSnapshot,
  PBKDF2_ITERATIONS,
  sha256Hex,
  timingSafeEqual,
  unpackSnapshot,
} from './crypto'

const key = () => crypto.getRandomValues(new Uint8Array(32))
const EXP = 1794900000
const note = () => ({
  ...newNoteDraft(1, DEFAULT_SETTINGS),
  title: 'api-fix.js',
  content: 'const x = 1\n'.repeat(50),
  language: 'javascript' as const,
})

beforeAll(() => __setPbkdf2Iterations(1000))
afterAll(() => __setPbkdf2Iterations(PBKDF2_ITERATIONS))

describe('deriveSecrets', () => {
  it('uses 600k PBKDF2 iterations by default', () => {
    expect(PBKDF2_ITERATIONS).toBe(600_000)
  })

  it('peerId depends only on the key, exp and flag; readToken also on the password', async () => {
    const k = key()
    const a = await deriveSecrets(k, EXP, 'aaaa-bbbb-cccc')
    const b = await deriveSecrets(k, EXP, 'dddd-eeee-ffff')
    expect(a.peerId).toBe(b.peerId)
    expect(a.peerId).toMatch(/^npz-[a-z2-7]{26}$/)
    expect(timingSafeEqual(a.readToken, b.readToken)).toBe(false)
  })

  it('treats hyphens and spaces in the password as insignificant', async () => {
    const k = key()
    const a = await deriveSecrets(k, EXP, 'aaaa-bbbb-cccc')
    const b = await deriveSecrets(k, EXP, 'aaaabbbb cccc')
    expect(timingSafeEqual(a.readToken, b.readToken)).toBe(true)
  })

  it('binds exp and the password flag', async () => {
    const k = key()
    const base = await deriveSecrets(k, EXP, null)
    const otherExp = await deriveSecrets(k, EXP + 1, null)
    const withPw = await deriveSecrets(k, EXP, 'aaaa-bbbb-cccc')
    expect(otherExp.peerId).not.toBe(base.peerId)
    expect(withPw.peerId).not.toBe(base.peerId)
    expect(timingSafeEqual(otherExp.readToken, base.readToken)).toBe(false)
  })
})

describe('snapshot encryption', () => {
  it.each([null, 'kq7m-x3vr-p9tz'])('round-trips (password %s)', async (pw) => {
    const s = await deriveSecrets(key(), EXP, pw)
    const n = note()
    const packed = await packSnapshot(n)
    expect(packed.length).toBeLessThan(n.content.length)
    const { iv, ciphertext } = await encryptSnapshot(s, packed)
    expect(iv.length).toBe(12)
    const out = await unpackSnapshot(await decryptSnapshot(s, iv, ciphertext))
    expect(out).toEqual({
      v: 1,
      title: 'api-fix.js',
      language: 'javascript',
      mode: 'plain',
      content: n.content,
    })
  })

  it('decrypt with wrong secrets throws', async () => {
    const k = key()
    const s = await deriveSecrets(k, EXP, 'right-pass-word')
    const wrong = await deriveSecrets(k, EXP, 'wrong-pass-word')
    const { iv, ciphertext } = await encryptSnapshot(s, await packSnapshot(note()))
    await expect(decryptSnapshot(wrong, iv, ciphertext)).rejects.toThrow()
  })

  it('unpack rejects tampered or non-snapshot data', async () => {
    await expect(unpackSnapshot(new Uint8Array([1, 2, 3]))).rejects.toThrow()
    const bytes = await deflate(new TextEncoder().encode(JSON.stringify({ foo: 1 })))
    await expect(unpackSnapshot(bytes)).rejects.toThrow()
  })
})

describe('helpers', () => {
  it('timingSafeEqual', () => {
    expect(timingSafeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2]))).toBe(true)
    expect(timingSafeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 3]))).toBe(false)
    expect(timingSafeEqual(new Uint8Array([1]), new Uint8Array([1, 2]))).toBe(false)
  })

  it('sha256Hex', async () => {
    expect(await sha256Hex(new TextEncoder().encode('abc'))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })
})
