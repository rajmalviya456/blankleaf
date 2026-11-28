/** Colour maths for the accent colour: WCAG contrast, and a shade of it that reads well. */

/**
 * What an accent has to stand out against in each theme: the surface closest to it in
 * lightness (the hover background; the others are further away) and the text drawn on it
 * (buttons). These are the --bg-hover and --accent-fg tokens in src/styles/index.css.
 */
export const SURFACE_EDGES = {
  light: { surface: '#e9ecf1', onAccent: '#ffffff' },
  dark: { surface: '#1d212a', onAccent: '#0b0d10' },
} as const

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG 2.1 contrast ratio of two #rrggbb colours, from 1 to 21. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

function toHsl(hex: string): [number, number, number] {
  const [r, g, b] = channels(hex)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h =
    max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h / 6, s, l]
}

function fromHsl(h: number, s: number, l: number): string {
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const channel = (t: number) => {
    const u = t < 0 ? t + 1 : t > 1 ? t - 1 : t
    const v =
      u < 1 / 6
        ? p + (q - p) * 6 * u
        : u < 1 / 2
          ? q
          : u < 2 / 3
            ? p + (q - p) * (2 / 3 - u) * 6
            : p
    return Math.round(v * 255)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${channel(h + 1 / 3)}${channel(h)}${channel(h - 1 / 3)}`
}

/**
 * The accent as this theme should draw it: the chosen colour, made darker (light theme) or
 * lighter (dark theme) just until it reads at 4.5:1 as text on every surface and with the
 * button text on it (WCAG 2.1 AA). The hue stays; a colour that already reads well is kept.
 */
export function accentShade(hex: string, theme: 'light' | 'dark'): string {
  const edge = SURFACE_EDGES[theme]
  const reads = (c: string) => contrast(c, edge.surface) >= 4.5 && contrast(c, edge.onAccent) >= 4.5
  if (reads(hex)) return hex
  const [h, s, l] = toHsl(hex)
  for (let step = 1; step <= 100; step++) {
    const next = theme === 'light' ? l - step / 100 : l + step / 100
    if (next < 0 || next > 1) break
    const c = fromHsl(h, s, next)
    if (reads(c)) return c
  }
  return theme === 'light' ? '#3d5ce6' : '#7c9cff'
}
