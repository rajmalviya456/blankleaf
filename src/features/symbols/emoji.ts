import type { Sym } from './symbols'

/** Emoji categories in Unicode order, numbered as in emojibase's groups (2 is skin-tone parts). */
export const EMOJI_CATEGORIES = [
  { id: 'smileys', label: 'Smileys', icon: '😀', group: 0 },
  { id: 'people', label: 'People', icon: '👋', group: 1 },
  { id: 'animals', label: 'Animals & nature', icon: '🐻', group: 3 },
  { id: 'food', label: 'Food & drink', icon: '🍔', group: 4 },
  { id: 'travel', label: 'Travel & places', icon: '✈️', group: 5 },
  { id: 'activities', label: 'Activities', icon: '⚽', group: 6 },
  { id: 'objects', label: 'Objects', icon: '💡', group: 7 },
  { id: 'symbols', label: 'Symbols', icon: '❤️', group: 8 },
  { id: 'flags', label: 'Flags', icon: '🏁', group: 9 },
] as const

export type EmojiCategoryId = (typeof EMOJI_CATEGORIES)[number]['id']
export interface EmojiGroup {
  id: EmojiCategoryId
  label: string
  items: Sym[]
}

/** The fields used from emojibase's data. */
interface RawEmoji {
  emoji: string
  label: string
  tags?: string[]
  group?: number
  order?: number
  version: number
  skins?: { emoji: string; tone?: number | number[] }[]
}

/** Versions every current phone and computer draws; only newer ones get tested. */
const SAFE_VERSION = 5

/**
 * The newest emoji version this device can draw, found by testing one plain (not joined)
 * emoji from each newer version, newest first.
 */
function newestDrawable(data: RawEmoji[], canDraw: (char: string) => boolean): number {
  const versions = [...new Set(data.map((e) => e.version))]
    .filter((v) => v > SAFE_VERSION)
    .sort((a, b) => b - a)
  for (const v of versions) {
    const sample = data.find((e) => e.version === v && !e.emoji.includes('\u200d'))
    if (sample && canDraw(sample.emoji)) return v
  }
  return SAFE_VERSION
}

/** Emoji grouped by category, leaving out any too new for this device to draw. */
export function buildEmojiGroups(
  data: RawEmoji[],
  canDraw: (char: string) => boolean,
): EmojiGroup[] {
  // Point releases (13.1, 15.1…) only add joined sequences of older emoji, which a device
  // without them shows as the parts side by side, never as an empty box.
  const limit = Math.floor(newestDrawable(data, canDraw)) + 1
  return EMOJI_CATEGORIES.map((c) => ({
    id: c.id,
    label: c.label,
    items: data
      .filter((e) => e.group === c.group && e.version < limit)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((e) => ({ char: e.emoji, name: e.label, tags: e.tags, skins: tonesOf(e) })),
  }))
}

/** The five single-tone versions, lightest first. Mixed tones (🧑🏻‍🤝‍🧑🏿) are left out. */
function tonesOf(e: RawEmoji): string[] | undefined {
  const skins = [1, 2, 3, 4, 5].map((t) => e.skins?.find((s) => s.tone === t)?.emoji)
  return skins.every(Boolean) ? (skins as string[]) : undefined
}

/** The emoji in skin tone 1 to 5, or as it is for 0 or when it has no tones. */
export function withTone(sym: Sym, tone: number): Sym {
  const char = tone > 0 ? sym.skins?.[tone - 1] : undefined
  return char ? { ...sym, char } : sym
}

/** Tone choices, with a raised hand to show each. */
export const SKIN_TONES = [
  { tone: 0, label: 'Default', sample: '✋' },
  { tone: 1, label: 'Light', sample: '✋🏻' },
  { tone: 2, label: 'Medium-light', sample: '✋🏼' },
  { tone: 3, label: 'Medium', sample: '✋🏽' },
  { tone: 4, label: 'Medium-dark', sample: '✋🏾' },
  { tone: 5, label: 'Dark', sample: '✋🏿' },
] as const

/**
 * Whether the device's fonts draw this as a colour emoji rather than an empty box: the box
 * comes out in the plain fill colour, a real emoji in colour.
 */
function canDrawEmoji(char: string): boolean {
  let ctx: CanvasRenderingContext2D | null = null
  try {
    ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  } catch {
    // No canvas (tests, very old browsers): show everything.
  }
  if (!ctx) return true
  const size = 20
  ctx.canvas.width = ctx.canvas.height = size
  ctx.textBaseline = 'top'
  ctx.font = `${size - 4}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`
  ctx.fillStyle = '#000'
  ctx.fillText(char, 0, 0)
  const px = ctx.getImageData(0, 0, size, size).data
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] && (px[i] !== px[i + 1] || px[i + 1] !== px[i + 2])) return true
  }
  return false
}

let cache: Promise<EmojiGroup[]> | null = null

/** Every emoji this device can show, by category. The data loads only when first asked for. */
export function loadEmoji(): Promise<EmojiGroup[]> {
  cache ??= import('emojibase-data/en/data.json')
    .then((m) => buildEmojiGroups(m.default, canDrawEmoji))
    .catch((err: unknown) => {
      cache = null // let the next open try again
      throw err
    })
  return cache
}
