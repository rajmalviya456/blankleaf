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
