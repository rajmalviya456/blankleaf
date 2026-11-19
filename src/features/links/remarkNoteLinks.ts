/**
 * Markdown preview: `[[Title]]` in ordinary text becomes a link to `#note:Title`, which the
 * preview opens as a note. A tree change, not a text change, so source offsets (which ticking
 * checklist boxes rely on) stay right. Code spans and blocks aren't text nodes, so they're left.
 */
export const NOTE_HREF = '#note:'

interface MdNode {
  type: string
  value?: string
  url?: string
  children?: MdNode[]
}

const LINK = /\[\[([^[\]\n]+)\]\]/g

function split(text: string): MdNode[] | null {
  const parts: MdNode[] = []
  let last = 0
  for (const m of text.matchAll(LINK)) {
    const title = m[1].trim()
    if (!title) continue
    if (m.index > last) parts.push({ type: 'text', value: text.slice(last, m.index) })
    parts.push({
      type: 'link',
      url: NOTE_HREF + encodeURIComponent(title),
      children: [{ type: 'text', value: title }],
    })
    last = m.index + m[0].length
  }
  if (!parts.length) return null
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) })
  return parts
}

function walk(node: MdNode) {
  if (!node.children || node.type === 'link') return
  const next: MdNode[] = []
  for (const child of node.children) {
    const parts = child.type === 'text' && child.value?.includes('[[') ? split(child.value) : null
    if (parts) next.push(...parts)
    else {
      walk(child)
      next.push(child)
    }
  }
  node.children = next
}

export function remarkNoteLinks() {
  return (tree: MdNode) => walk(tree)
}
