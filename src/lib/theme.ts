import type { Settings } from '../domain/types'

export type ThemePref = 'system' | 'light' | 'dark'
export type Theme = 'light' | 'dark'

const THEME_KEY = 'blankleaf:theme'

export function resolveTheme(pref: ThemePref, systemDark: boolean): Theme {
  if (pref === 'system') return systemDark ? 'dark' : 'light'
  return pref
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}

const DARK_QUERY = '(prefers-color-scheme: dark)'

export function systemPrefersDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches
}

/** Subscribe to OS theme changes. Returns an unsubscribe function. */
export function onSystemThemeChange(cb: (dark: boolean) => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => {}
  const mql = window.matchMedia(DARK_QUERY)
  const handler = (e: MediaQueryListEvent) => cb(e.matches)
  mql.addEventListener('change', handler)
  return () => mql.removeEventListener('change', handler)
}

/** Cycle order for the ◐ toggle: system → light → dark → system. */
export function nextThemePref(pref: ThemePref): ThemePref {
  return pref === 'system' ? 'light' : pref === 'light' ? 'dark' : 'system'
}

const HEX = /^#[0-9a-f]{6}$/i

/** Push appearance settings onto <html>: theme attribute plus CSS variables. */
/** Browser bar colour per theme (matches --bg). */
export const THEME_COLOR = { light: '#ffffff', dark: '#111318' } as const

export function applySettingsToDocument(s: Settings, systemDark: boolean): void {
  const root = document.documentElement
  const theme = resolveTheme(s.theme, systemDark)
  applyTheme(theme)
  // index.html reads this before anything loads, so the first paint has the right colours.
  try {
    localStorage.setItem(THEME_KEY, s.theme)
  } catch {
    // Private browsing: the system theme is used for the first paint instead.
  }
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLOR[theme])
  root.style.setProperty('--editor-font-size', `${s.editorFontSize}px`)
  root.style.setProperty('--editor-line-height', String(s.lineHeight))
  root.style.setProperty('--ui-font-size', `${s.uiFontSize}px`)
  if (HEX.test(s.accent)) {
    root.style.setProperty('--accent', s.accent)
    root.style.setProperty('--accent-soft', `${s.accent}24`)
  } else {
    root.style.removeProperty('--accent')
    root.style.removeProperty('--accent-soft')
  }
}
