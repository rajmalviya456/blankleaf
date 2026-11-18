export function textStats(text: string): { words: number; chars: number } {
  const words = text.match(/\S+/g)?.length ?? 0
  return { words, chars: text.length }
}

/** 1-based line and column of `pos` in `text` (pos is clamped to the text). */
export function lineColAt(text: string, pos: number): { line: number; col: number } {
  const p = Math.max(0, Math.min(pos, text.length))
  let line = 1
  let lineStart = 0
  for (let i = text.indexOf('\n'); i !== -1 && i < p; i = text.indexOf('\n', i + 1)) {
    line++
    lineStart = i + 1
  }
  return { line, col: p - lineStart + 1 }
}

/** Word and character counts of the selection from `anchor` to `head`, or null if none. */
export function selectionStats(
  text: string,
  anchor: number | undefined,
  head: number | undefined,
): { words: number; chars: number } | null {
  const a = Math.max(0, Math.min(anchor ?? 0, text.length))
  const h = Math.max(0, Math.min(head ?? a, text.length))
  if (a === h) return null
  return textStats(text.slice(Math.min(a, h), Math.max(a, h)))
}

/** "2 words, 7 chars selected" */
export const selectionLabel = (s: { words: number; chars: number }) =>
  `${s.words.toLocaleString()} ${s.words === 1 ? 'word' : 'words'}, ${s.chars.toLocaleString()} ${s.chars === 1 ? 'char' : 'chars'} selected`
