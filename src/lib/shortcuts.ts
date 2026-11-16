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
}

type KeyLike = Pick<KeyboardEvent, 'code' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>

export function matchShortcut(e: KeyLike, s: Shortcut, p: Platform): boolean {
  if (e.code !== s.code || e.shiftKey !== Boolean(s.shift)) return false
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
