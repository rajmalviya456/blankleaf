/**
 * The words in a stretch of text worth spell checking, with their positions. Code, links,
 * addresses, acronyms, camelCase names and words joined to digits are left out: they're
 * spelled the way they are on purpose.
 */
export interface Word {
  word: string
  from: number
  to: number
}

const FENCE = /^ {0,3}(`{3,}|~{3,})/
const SKIP = [
  /`[^`\n]+`/g, // inline code
  /\b(?:https?:\/\/|www\.)[^\s<>()]+/g, // web addresses
  /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, // email addresses
  /\]\([^)\s]*\)/g, // a Markdown link's target
  /\[\[[^[\]\n]*\]\]/g, // [[note links]]
]
const WORD = /\p{L}[\p{L}\p{M}'’]*/gu

/** Ranges (relative to `text`) that aren't prose. */
function skipped(text: string): [number, number][] {
  const ranges: [number, number][] = []
  let fence: string | null = null
  let fenceFrom = 0
  let at = 0
  for (const line of text.split('\n')) {
    const f = FENCE.exec(line)
    if (fence) {
      if (f && f[1][0] === fence[0] && f[1].length >= fence.length) {
        ranges.push([fenceFrom, at + line.length])
        fence = null
      }
    } else if (f) {
      fence = f[1]
      fenceFrom = at
    }
    at += line.length + 1
  }
  if (fence) ranges.push([fenceFrom, text.length])
  for (const re of SKIP)
    for (const m of text.matchAll(re)) ranges.push([m.index, m.index + m[0].length])
  return ranges
}

/** Spelled that way on purpose: acronyms (HTML), camelCase and brand names (useState, iPhone). */
const deliberate = (w: string) => (w.length > 1 && w === w.toUpperCase()) || /\p{Ll}\p{Lu}/u.test(w)

export function wordsToCheck(text: string, offset: number): Word[] {
  const skip = skipped(text)
  const inSkip = (from: number, to: number) => skip.some(([a, b]) => from < b && to > a)
  const out: Word[] = []
  for (const m of text.matchAll(WORD)) {
    const word = m[0].replace(/['’]+$/, '')
    const from = m.index
    const to = from + word.length
    if (word.length < 2 || deliberate(word) || inSkip(from, to)) continue
    // Joined to a digit or underscore: an identifier or code, like v2 or user_name.
    if (/[\d_]/.test(text[from - 1] ?? '') || /[\d_]/.test(text[to] ?? '')) continue
    out.push({ word, from: offset + from, to: offset + to })
  }
  return out
}
