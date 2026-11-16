import { generatePassword, isPasswordValid, normalizePassword, PASSWORD_ALPHABET } from './password'

describe('passwords', () => {
  it('generates 12 chars from the alphabet grouped 4-4-4', () => {
    const re = new RegExp(
      `^[${PASSWORD_ALPHABET}]{4}-[${PASSWORD_ALPHABET}]{4}-[${PASSWORD_ALPHABET}]{4}$`,
    )
    const seen = new Set<string>()
    for (let i = 0; i < 200; i++) {
      const p = generatePassword()
      expect(p).toMatch(re)
      expect(p).not.toMatch(/[01oil]/)
      seen.add(p)
    }
    expect(seen.size).toBe(200)
  })

  it('normalizes spaces and hyphens, keeps case', () => {
    expect(normalizePassword(' Kq7m-x3vr p9tz ')).toBe('Kq7mx3vrp9tz')
  })

  it('rejects passwords shorter than 8 after normalising', () => {
    expect(isPasswordValid('ab-cd-ef')).toBe(false)
    expect(isPasswordValid('abcd-efgh')).toBe(true)
  })

  it('uses unbiased sampling from the random source', () => {
    // A source that always returns 255 must be rejected (255 >= 248 = 31*8) until a usable byte arrives.
    let calls = 0
    const rng = (n: number) => {
      calls++
      return new Uint8Array(n).fill(calls === 1 ? 255 : 0)
    }
    expect(generatePassword(rng)).toBe('aaaa-aaaa-aaaa')
  })
})
