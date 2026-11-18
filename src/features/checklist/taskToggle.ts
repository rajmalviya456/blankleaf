/** A list item with a task box, from its start: indent, marker, space, then [ ] / [x]. */
const TASK = /^([ \t]*(?:[-*+]|\d+[.)])[ \t]+\[)([ xX])(\][ \t]*)(.*)/

/** Tick or untick the task box of the list item that starts at `offset` in `source`. */
export function toggleTaskAt(source: string, offset: number): string {
  const m = TASK.exec(source.slice(offset))
  if (!m) return source
  const at = offset + m[1].length
  return source.slice(0, at) + (m[2] === ' ' ? 'x' : ' ') + source.slice(at + 1)
}

/** The text after the box on that item's first line (used to label the checkbox). */
export function taskLabelAt(source: string, offset: number): string | null {
  const m = TASK.exec(source.slice(offset))
  return m ? m[4].split('\n')[0].trim() : null
}
