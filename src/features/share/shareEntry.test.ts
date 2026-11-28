import { buildShareLink, parseShareHash } from './link'
import { forgetShare, takeShareEntry } from './shareEntry'

const goTo = (url: string) => history.replaceState(null, '', url)
const here = () => location.pathname + location.search + location.hash
const shareHash = () =>
  new URL(
    buildShareLink('https://x.dev/blankleaf/', {
      key: crypto.getRandomValues(new Uint8Array(32)),
      exp: 1794900000,
      hasPassword: false,
    }),
  ).hash

beforeEach(() => {
  sessionStorage.clear()
  goTo('/blankleaf/')
})
afterEach(() => vi.restoreAllMocks())

describe('opening the page', () => {
  it('a share link opens the share page, and its key leaves the address bar', () => {
    const hash = shareHash()
    goTo(`/blankleaf/${hash}`)
    expect(takeShareEntry()).toEqual({ kind: 'link', parts: parseShareHash(hash) })
    expect(here()).toBe('/blankleaf/')
  })

  it('a cut-off share link opens the share page to say so, and leaves the address bar', () => {
    // As mail apps cut long links: the end missing, or most of the key.
    for (const cut of ['#/s/AAAA', '#/s/', shareHash().slice(0, -2)]) {
      goTo(`/blankleaf/${cut}`)
      expect(takeShareEntry(), cut).toEqual({ kind: 'broken' })
      expect(here()).toBe('/blankleaf/')
    }
  })

  it('any other address opens the notepad, left as it is', () => {
    for (const url of [
      '/blankleaf/',
      '/blankleaf/#notes',
      '/blankleaf/#/x/AAAA',
      '/blankleaf/?shortcut=new',
    ]) {
      goTo(url)
      expect(takeShareEntry(), url).toBeNull()
      expect(here()).toBe(url)
    }
  })
})

describe('reloading the share page', () => {
  it('comes back to the share page: the link waits in this tab, out of the address bar', () => {
    goTo(`/blankleaf/${shareHash()}`)
    const opened = takeShareEntry()
    // A reload (or pull-to-refresh): the address bar has no link any more.
    expect(takeShareEntry()).toEqual(opened)
    expect(here()).toBe('/blankleaf/')
  })

  it('opens the notepad once the share page is done with', () => {
    goTo(`/blankleaf/${shareHash()}`)
    takeShareEntry()
    forgetShare()
    expect(takeShareEntry()).toBeNull()
  })

  it('a newer link takes the place of the one waiting, a cut-off one too', () => {
    goTo(`/blankleaf/${shareHash()}`)
    takeShareEntry()
    const newer = shareHash()
    goTo(`/blankleaf/${newer}`)
    takeShareEntry()
    expect(takeShareEntry()).toEqual({ kind: 'link', parts: parseShareHash(newer) })
    goTo('/blankleaf/#/s/AAAA')
    expect(takeShareEntry()).toEqual({ kind: 'broken' })
    expect(takeShareEntry()).toBeNull()
  })

  it('without session storage (blocked by the browser) a link still opens', () => {
    vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError')
    })
    const hash = shareHash()
    goTo(`/blankleaf/${hash}`)
    expect(takeShareEntry()).toEqual({ kind: 'link', parts: parseShareHash(hash) })
    expect(takeShareEntry()).toBeNull()
    expect(() => forgetShare()).not.toThrow()
  })
})
