/** A Markdown note's headings, for the Outline menu. */
export interface Heading {
  level: number
  text: string
  /** Where the heading's line starts in the note. */
  from: number
}

const ATX = /^ {0,3}(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/
const FENCE = /^ {0,3}(`{3,}|~{3,})/

/** Heading text without its Markdown: **bold**, `code` and [link](url) become plain words. */
function plain(text: string): string {
  return text
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__|\*|_|~~|`)(.+?)\1/g, '$2')
    .trim()
}

/** ATX headings (`## Title`), skipping lines inside fenced code blocks. */
export function outline(text: string): Heading[] {
  const headings: Heading[] = []
  let fence: string | null = null
  let from = 0
  for (const line of text.split('\n')) {
    const f = FENCE.exec(line)
    if (fence) {
      if (f && f[1][0] === fence[0] && f[1].length >= fence.length) fence = null
    } else if (f) {
      fence = f[1]
    } else {
      const m = ATX.exec(line)
      if (m && m[2].trim()) headings.push({ level: m[1].length, text: plain(m[2]), from })
    }
    from += line.length + 1
  }
  return headings
}
