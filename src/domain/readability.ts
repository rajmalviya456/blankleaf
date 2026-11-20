/**
 * How easy a note is to read: Flesch–Kincaid grade and reading ease, sentences over 25 words, and
 * the words used most. Code, links and Markdown marks don't count; headings and list items are
 * sentences of their own.
 */
export interface Readability {
  words: number
  sentences: number
  /** US school grade; 0 for very simple text. */
  grade: number
  /** Flesch reading ease, 0–100 (higher is easier). */
  ease: number
  label: string
  /** Where sentences longer than LONG_SENTENCE words are, in the original text. */
  longSentences: { from: number; to: number; words: number }[]
  /** Words used at least three times, most first (little common words left out). */
  overused: { word: string; count: number }[]
}

export const LONG_SENTENCE = 25
const OVERUSED_MIN = 3
const OVERUSED_MAX = 5

const STOPWORDS = new Set(
  `a about above after again all also am an and any are as at be because been before being below
between both but by can could did do does doing down during each few for from further had has
have having he her here hers him his how i if in into is it its itself just me more most my no nor
not now of off on once only or other our ours out over own same she should so some such than that
the their them then there these they this those through to too under until up very was we were
what when where which while who whom why will with would you your yours it's i'm don't can't
won't isn't that's let's`.split(/\s+/),
)

const WORD = /\p{L}[\p{L}\p{M}'’]*/gu

/** Code, links and Markdown marks blanked out with spaces, so positions stay the same. */
function proseOnly(text: string): string {
  const blank = (s: string) => s.replace(/[^\n]/g, ' ')
  return text
    .replace(/^ {0,3}(```|~~~)[^\n]*\n[\s\S]*?(?:\n {0,3}\1[^\n]*|(?![\s\S]))/gm, blank)
    .replace(/`[^`\n]+`/g, blank)
    .replace(/\b(?:https?:\/\/|www\.)[^\s<>()]+/g, blank)
    .replace(/\]\([^)\s]*\)/g, blank)
    .replace(/^(\s*)(#{1,6}\s|[-*+]\s(\[[ xX]\]\s)?|\d+[.)]\s|>\s?)/gm, (m) => blank(m))
}

/** Sentences, as [from, to) ranges: split at . ! ?, blank lines, headings and list items. */
function sentenceRanges(prose: string, text: string): [number, number][] {
  const ranges: [number, number][] = []
  // Each line that starts a heading or list item, and each paragraph, is its own block.
  const blockStarts = /\n\s*\n|\n(?= {0,3}(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|>))/g
  let start = 0
  const blocks: [number, number][] = []
  for (const m of text.matchAll(blockStarts)) {
    blocks.push([start, m.index])
    start = m.index + m[0].length
  }
  blocks.push([start, text.length])
  for (const [from, to] of blocks) {
    const part = prose.slice(from, to)
    const end = /[.!?]+(?=\s|$)/g
    let s = 0
    for (const m of part.matchAll(end)) {
      ranges.push([from + s, from + m.index + m[0].length])
      s = m.index + m[0].length
    }
    if (s < part.length) ranges.push([from + s, to])
  }
  // Trim whitespace at both ends.
  return ranges
    .map(([a, b]): [number, number] => {
      while (a < b && /\s/.test(prose[a])) a++
      while (b > a && /\s/.test(prose[b - 1])) b--
      return [a, b]
    })
    .filter(([a, b]) => b > a)
}

export function syllables(word: string): number {
  let w = word.toLowerCase().replace(/[^a-z]/g, '')
  if (w.length <= 3) return 1
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '')
  return Math.max(1, w.match(/[aeiouy]{1,3}/g)?.length ?? 0)
}

function label(ease: number): string {
  if (ease >= 80) return 'Easy'
  if (ease >= 60) return 'Plain English'
  if (ease >= 50) return 'Fairly hard'
  if (ease >= 30) return 'Hard'
  return 'Very hard'
}

export function readability(text: string): Readability {
  const prose = proseOnly(text)
  let words = 0
  let sentences = 0
  let syl = 0
  const longSentences: Readability['longSentences'] = []
  const counts = new Map<string, { count: number; first: number }>()
  for (const [from, to] of sentenceRanges(prose, text)) {
    const found = [...prose.slice(from, to).matchAll(WORD)].map((m) => m[0])
    if (!found.length) continue
    sentences++
    words += found.length
    for (const w of found) {
      syl += syllables(w)
      const key = w.toLowerCase().replace(/’/g, "'")
      if (key.length < 3 || STOPWORDS.has(key)) continue
      const entry = counts.get(key)
      if (entry) entry.count++
      else counts.set(key, { count: 1, first: counts.size })
    }
    if (found.length > LONG_SENTENCE) longSentences.push({ from, to, words: found.length })
  }
  if (!words)
    return { words: 0, sentences: 0, grade: 0, ease: 0, label: '', longSentences, overused: [] }
  const perSentence = words / sentences
  const perWord = syl / words
  const grade = Math.max(0, Math.round((0.39 * perSentence + 11.8 * perWord - 15.59) * 10) / 10)
  const ease = Math.max(
    0,
    Math.min(100, Math.round(206.835 - 1.015 * perSentence - 84.6 * perWord)),
  )
  const overused = [...counts]
    .filter(([, v]) => v.count >= OVERUSED_MIN)
    .sort((a, b) => b[1].count - a[1].count || a[1].first - b[1].first)
    .slice(0, OVERUSED_MAX)
    .map(([word, v]) => ({ word, count: v.count }))
  return { words, sentences, grade, ease, label: label(ease), longSentences, overused }
}
