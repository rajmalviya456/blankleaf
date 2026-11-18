import { buildShareLink, parseShareHash } from './link'

const key = () => crypto.getRandomValues(new Uint8Array(32))

describe('share links', () => {
  it('round-trips link parts', () => {
    const parts = { key: key(), exp: 1794900000, hasPassword: true }
    const link = buildShareLink('https://x.dev/blankleaf/', parts)
    expect(link.startsWith('https://x.dev/blankleaf/#/s/')).toBe(true)
    expect(parseShareHash(new URL(link).hash)).toEqual(parts)
    expect(
      parseShareHash(
        new URL(buildShareLink('https://x.dev/blankleaf/', { ...parts, hasPassword: false })).hash,
      )?.hasPassword,
    ).toBe(false)
  })

  it('rejects malformed hashes', () => {
    const good = new URL(
      buildShareLink('https://x.dev/', { key: key(), exp: 1794900000, hasPassword: false }),
    ).hash
    const [, body] = good.split('#/s/')
    const [k, e] = body.split('.')
    for (const bad of [
      '',
      '#/x/' + body,
      `#/s/${k.slice(0, 10)}.${e}.n`,
      `#/s/${k}.!!.n`,
      `#/s/${k}.${e}.q`,
      `#/s/${k}.${e}.n.extra`,
      `#/s/${k}.${e}`,
    ])
      expect(parseShareHash(bad), bad).toBeNull()
  })
})
