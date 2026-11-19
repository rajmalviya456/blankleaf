/** English spell checking on a Hunspell dictionary (nspell), plus the person's own words. */
import nspell from 'nspell'

export interface Checker {
  correct(word: string): boolean
  /** Up to five likely corrections, best first. */
  suggest(word: string): string[]
  add(word: string): void
}

const MAX_SUGGESTIONS = 5
/** Curly apostrophes (from phones and pasted text) are spelled like straight ones. */
const plain = (word: string) => word.replace(/’/g, "'")

/** The word with each pair of neighbouring letters swapped: "teh" → "eth", "the". */
function swaps(word: string): string[] {
  const out: string[] = []
  for (let i = 0; i < word.length - 1; i++)
    out.push(word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2))
  return out
}

/** Words the dictionary lacks but every Blankleaf note may use. */
const BUILT_IN = ['Blankleaf']

export function createChecker(aff: string, dic: string, personal: string[]): Checker {
  const spell = nspell(aff, dic)
  for (const w of [...BUILT_IN, ...personal]) spell.add(w)
  return {
    correct: (word) => spell.correct(plain(word)),
    // Swapped letters are the commonest typo, but the dictionary ranks them low: put them first.
    suggest: (word) => {
      const w = plain(word)
      const swapped = swaps(w).filter((s) => s !== w && spell.correct(s))
      return [...new Set([...swapped, ...spell.suggest(w)])].slice(0, MAX_SUGGESTIONS)
    },
    add: (word) => void spell.add(plain(word)),
  }
}
