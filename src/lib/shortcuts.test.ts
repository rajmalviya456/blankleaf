import { formatShortcut, matchShortcut, type Shortcut } from './shortcuts'

const k = (code: string, m: Partial<KeyboardEvent> = {}) => ({
  code,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...m,
})

describe('matchShortcut', () => {
  const mod2N: Shortcut = { code: 'KeyN', mod2: true }

  it('Mod2 is Ctrl+Option on mac', () => {
    expect(matchShortcut(k('KeyN', { ctrlKey: true, altKey: true }), mod2N, 'mac')).toBe(true)
  })

  it('mac Option alone does not match Mod2', () => {
    expect(matchShortcut(k('KeyN', { altKey: true }), mod2N, 'mac')).toBe(false)
  })

  it('Mod2 is Alt elsewhere', () => {
    expect(matchShortcut(k('KeyN', { altKey: true }), mod2N, 'other')).toBe(true)
  })

  it('AltGr does not match Mod2', () => {
    const d7: Shortcut = { code: 'Digit7', mod2: true }
    expect(matchShortcut(k('Digit7', { ctrlKey: true, altKey: true }), d7, 'other')).toBe(false)
  })

  it('AltGr does not match a Ctrl shortcut either', () => {
    expect(
      matchShortcut(
        k('KeyK', { ctrlKey: true, altKey: true }),
        { code: 'KeyK', mod: true },
        'other',
      ),
    ).toBe(false)
  })

  it('mod is Cmd on mac and Ctrl elsewhere', () => {
    const modK: Shortcut = { code: 'KeyK', mod: true }
    expect(matchShortcut(k('KeyK', { metaKey: true }), modK, 'mac')).toBe(true)
    expect(matchShortcut(k('KeyK', { ctrlKey: true }), modK, 'mac')).toBe(false)
    expect(matchShortcut(k('KeyK', { ctrlKey: true }), modK, 'other')).toBe(true)
  })

  it('requires shift to match exactly', () => {
    const f: Shortcut = { code: 'KeyF', mod: true, shift: true }
    expect(matchShortcut(k('KeyF', { metaKey: true, shiftKey: true }), f, 'mac')).toBe(true)
    expect(matchShortcut(k('KeyF', { metaKey: true }), f, 'mac')).toBe(false)
    expect(matchShortcut(k('KeyF', { metaKey: true }), { code: 'KeyF', mod: true }, 'mac')).toBe(
      true,
    )
    expect(
      matchShortcut(
        k('KeyF', { metaKey: true, shiftKey: true }),
        { code: 'KeyF', mod: true },
        'mac',
      ),
    ).toBe(false)
  })

  it('plain keys need no modifiers at all', () => {
    expect(matchShortcut(k('F2'), { code: 'F2' }, 'mac')).toBe(true)
    expect(matchShortcut(k('F2', { altKey: true }), { code: 'F2' }, 'mac')).toBe(false)
  })
})

describe('formatShortcut', () => {
  it('formats for mac and other platforms', () => {
    expect(formatShortcut({ code: 'KeyN', mod2: true }, 'mac')).toBe('⌃⌥N')
    expect(formatShortcut({ code: 'KeyN', mod2: true }, 'other')).toBe('Alt+N')
    expect(formatShortcut({ code: 'KeyK', mod: true }, 'mac')).toBe('⌘K')
    expect(formatShortcut({ code: 'KeyF', mod: true, shift: true }, 'mac')).toBe('⌘⇧F')
    expect(formatShortcut({ code: 'KeyF', mod: true, shift: true }, 'other')).toBe('Ctrl+Shift+F')
    expect(formatShortcut({ code: 'KeyT', mod2: true, shift: true }, 'mac')).toBe('⌃⌥⇧T')
    expect(formatShortcut({ code: 'BracketRight', mod2: true }, 'other')).toBe('Alt+]')
    expect(formatShortcut({ code: 'Comma', mod: true }, 'mac')).toBe('⌘,')
    expect(formatShortcut({ code: 'Digit3', mod2: true }, 'mac')).toBe('⌃⌥3')
    expect(formatShortcut({ code: 'F2' }, 'mac')).toBe('F2')
  })
})
