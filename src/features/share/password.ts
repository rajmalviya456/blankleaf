/** Share passwords: easy to read aloud (no 0/o/1/l/i), grouped xxxx-xxxx-xxxx. */
export const PASSWORD_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
export const MIN_PASSWORD_LEN = 8
const LENGTH = 12

type Random = (n: number) => Uint8Array
const cryptoRandom: Random = (n) => crypto.getRandomValues(new Uint8Array(n))

/** 12 random characters (about 59 bits) without modulo bias, grouped for reading. */
export function generatePassword(random: Random = cryptoRandom): string {
  const size = PASSWORD_ALPHABET.length
  const limit = 256 - (256 % size) // reject bytes that would skew the distribution
  let out = ''
  while (out.length < LENGTH) {
    for (const b of random(LENGTH * 2)) {
      if (b >= limit) continue
      out += PASSWORD_ALPHABET[b % size]
      if (out.length === LENGTH) break
    }
  }
  return `${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8)}`
}

/** Spaces and hyphens are only for readability; everything else (including case) counts. */
export function normalizePassword(input: string): string {
  return input.replace(/[\s-]+/g, '')
}

export function isPasswordValid(input: string): boolean {
  return normalizePassword(input).length >= MIN_PASSWORD_LEN
}
