import { defaultFilter } from 'cmdk'

const words = (text: string) =>
  text
    .toLowerCase()
    .split(/[\s.:/()_,-]+/)
    .filter(Boolean)

/**
 * How well a palette item matches what's typed (0 = hidden). cmdk's own fuzzy score lets letters
 * scattered through a title ("spell" in "New from template: Checklist") beat a real word match,
 * so whole-word matches come first and loose matches are kept, but last.
 */
export function paletteScore(value: string, search: string, keywords: string[] = []): number {
  const q = search.trim().toLowerCase()
  if (!q) return 1
  const v = value.toLowerCase()
  const vw = words(value)
  if (v.startsWith(q)) return 1
  if (vw.some((w) => w.startsWith(q))) return 0.9
  if (v.includes(q)) return 0.75
  const kw = keywords.flatMap(words)
  if (kw.some((k) => k.startsWith(q))) return 0.65
  const qw = words(q)
  if (
    qw.length > 1 &&
    qw.every((w) => vw.some((x) => x.startsWith(w)) || kw.some((k) => k.startsWith(w)))
  )
    return 0.6
  if (kw.some((k) => k.includes(q))) return 0.5
  return defaultFilter(value, search, keywords) * 0.3
}
