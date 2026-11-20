import type { Platform } from './platform'

/**
 * A keyboard shortcut matched on the physical key (`KeyboardEvent.code`), so it works on
 * any keyboard layout.
 *  - `mod`  = ⌘ on macOS, Ctrl elsewhere.
 *  - `mod2` = ⌃⌥ (Control+Option) on macOS, Alt elsewhere. Plain Option is never used on
 *    a Mac because it types characters ([, ], |, @ …); Ctrl+Alt elsewhere is AltGr and is
 *    never matched for the same reason.
 */
export interface Shortcut {
  code: string
  mod?: boolean
  mod2?: boolean
  shift?: boolean
  /** Only active in the installed app window, where the browser doesn't own the key. */
  standaloneOnly?: boolean
  /** Left to the editor while typing in a code note (Cmd/Ctrl+/ comments a line there). */
  yieldsToCode?: boolean
  /** Left to the editor while typing in a Markdown note (Cmd/Ctrl+B bolds there). */
  yieldsToMarkdown?: boolean
}

type KeyLike = Pick<KeyboardEvent, 'code' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'> &
  Partial<Pick<KeyboardEvent, 'key'>>

const PUNCT: Record<string, string> = {
  Period: '.',
  Comma: ',',
  Slash: '/',
  BracketLeft: '[',
  BracketRight: ']',
}

/** The character a shortcut's key should type, for layout-aware matching (letters, punctuation). */
function expectedChar(code: string): string | null {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase()
  return PUNCT[code] ?? null
}

/**
 * Does this key event press the shortcut's key? When the event types a plain printable
 * character, the character decides (so on Dvorak, Cmd+V stays paste and the key that types
 * "b" is Cmd+B). When the character is composed or absent (Option on a Mac, digits, F-keys),
 * the physical key decides.
 */
function sameKey(e: KeyLike, code: string): boolean {
  const want = expectedChar(code)
  const key = e.key ?? ''
  if (want && key.length === 1 && /[\x21-\x7e]/.test(key)) return key.toLowerCase() === want
  return e.code === code
}

export function matchShortcut(e: KeyLike, s: Shortcut, p: Platform): boolean {
  if (!sameKey(e, s.code) || e.shiftKey !== Boolean(s.shift)) return false
  const mod = Boolean(s.mod)
  const mod2 = Boolean(s.mod2)
  if (p === 'mac') {
    return e.metaKey === mod && e.ctrlKey === mod2 && e.altKey === mod2
  }
  return !e.metaKey && e.ctrlKey === mod && e.altKey === mod2
}

const KEY_LABELS: Record<string, string> = {
  BracketLeft: '[',
  BracketRight: ']',
  Comma: ',',
  Period: '.',
  Slash: '/',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Minus: '-',
  Equal: '=',
  Backquote: '`',
  Escape: 'Esc',
  Enter: 'Enter',
  Space: 'Space',
  PageUp: 'PgUp',
  PageDown: 'PgDn',
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓',
}

function keyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3)
  if (code.startsWith('Digit')) return code.slice(5)
  return KEY_LABELS[code] ?? code
}

export function formatShortcut(s: Shortcut, p: Platform): string {
  const key = keyLabel(s.code)
  if (p === 'mac') {
    return `${s.mod2 ? '⌃⌥' : ''}${s.mod ? '⌘' : ''}${s.shift ? '⇧' : ''}${key}`
  }
  const parts: string[] = []
  if (s.mod) parts.push('Ctrl')
  if (s.mod2) parts.push('Alt')
  if (s.shift) parts.push('Shift')
  parts.push(key)
  return parts.join('+')
}
