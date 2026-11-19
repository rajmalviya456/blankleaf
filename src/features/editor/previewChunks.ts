/**
 * A big note's preview is drawn in chunks of whole paragraphs, so an edit redraws only its own
 * chunk and React can pause between chunks instead of freezing the page.
 */
export interface Chunk {
  text: string
  /** Where the chunk starts in the note (to tick checklist boxes in the right place). */
  offset: number
}

const FENCE = /^ {0,3}(`{3,}|~{3,})/
const TARGET_CHARS = 4000

/**
 * Chunks of about `target` characters, cut only after a blank line outside code blocks. The
 * chunks joined back together are exactly the note.
 */
export function previewChunks(text: string, target = TARGET_CHARS): Chunk[] {
  if (text.length <= target) return [{ text, offset: 0 }]
  const chunks: Chunk[] = []
  let start = 0
  let at = 0
  let fence: string | null = null
  for (const line of text.split('\n')) {
    const end = at + line.length + 1 // past this line's newline
    const f = FENCE.exec(line)
    if (fence) {
      if (f && f[1][0] === fence[0] && f[1].length >= fence.length) fence = null
    } else if (f) {
      fence = f[1]
    } else if (!line.trim() && end - start >= target && end < text.length) {
      chunks.push({ text: text.slice(start, end), offset: start })
      start = end
    }
    at = end
  }
  if (start < text.length) chunks.push({ text: text.slice(start), offset: start })
  return chunks
}

/** Footnotes and reference-style links join distant parts of a note: draw those notes whole. */
export function canChunk(text: string): boolean {
  return !/^ {0,3}\[[^\]\n]+\]:/m.test(text)
}
