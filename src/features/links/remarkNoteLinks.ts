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
  position?: { start: { offset?: number }; end: { offset?: number } }
}

const LINK = /\[\[([^[\]\n]+)\]\]/g
/** Inline nodes a link's title may run through, e.g. `[[a *big* plan]]`. */
const INLINE = new Set(['emphasis', 'strong', 'delete'])

const noteLink = (title: string, children: MdNode[]): MdNode => ({
  type: 'link',
  url: NOTE_HREF + encodeURIComponent(title),
  children,
})

function split(text: string): MdNode[] | null {
  const parts: MdNode[] = []
  let last = 0
  for (const m of text.matchAll(LINK)) {
    const title = m[1].trim()
    if (!title) continue
    if (m.index > last) parts.push({ type: 'text', value: text.slice(last, m.index) })
    parts.push(noteLink(title, [{ type: 'text', value: title }]))
    last = m.index + m[0].length
  }
  if (!parts.length) return null
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) })
  return parts
}

/**
 * `[[` in one text node closed by `]]` in a later one, with only emphasis between: the link
 * keeps that formatting, and its title is the source text, as the editor reads it.
 */
function spanning(
  children: MdNode[],
  i: number,
  source: string,
): { link: MdNode[]; end: number } | null {
  const open = children[i]
  const at = open.value!.lastIndexOf('[[')
  if (at < 0 || open.value!.indexOf(']]', at) >= 0) return null
  for (let j = i + 1; j < children.length; j++) {
    const c = children[j]
    if (c.type === 'text' && c.value?.includes(']]')) {
      const from = open.position?.start.offset
      const to = c.position?.end.offset
      if (from === undefined || to === undefined) return null
      const m = /\[\[([^[\]\n]+)\]\]/.exec(source.slice(from, to))
      const title = m?.[1].trim()
      if (!title) return null
      const close = c.value.indexOf(']]')
      const inner = [
        { type: 'text', value: open.value!.slice(at + 2).replace(/^\s+/, '') },
        ...children.slice(i + 1, j),
        { type: 'text', value: c.value.slice(0, close).replace(/\s+$/, '') },
      ].filter((n) => n.type !== 'text' || n.value)
      const before = open.value!.slice(0, at)
      const after = c.value.slice(close + 2)
      const link: MdNode[] = [
        ...(before ? [{ type: 'text', value: before }] : []),
        noteLink(title, inner),
        ...(after ? (split(after) ?? [{ type: 'text', value: after }]) : []),
      ]
      return { link, end: j }
    }
    if (!INLINE.has(c.type) && c.type !== 'text') return null
  }
  return null
}

function walk(node: MdNode, source: string) {
  if (!node.children || node.type === 'link') return
  const next: MdNode[] = []
  const kids = node.children
  for (let i = 0; i < kids.length; i++) {
    const child = kids[i]
    if (child.type === 'text' && child.value?.includes('[[')) {
      const across = spanning(kids, i, source)
      if (across) {
        // Links earlier in the same text node.
        const head = across.link[0]
        const lead = head.type === 'text' ? split(head.value ?? '') : null
        next.push(...(lead ? [...lead, ...across.link.slice(1)] : across.link))
        i = across.end
        continue
      }
      const parts = split(child.value)
      if (parts) {
        next.push(...parts)
        continue
      }
    }
    walk(child, source)
    next.push(child)
  }
  node.children = next
}

export function remarkNoteLinks() {
  return (tree: MdNode, file: { value?: unknown }) => walk(tree, String(file?.value ?? ''))
}
