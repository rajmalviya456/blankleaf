/**
 * GitHub-flavoured Markdown only makes `- [ ]` a task when text follows the box, so a blank task
 * line (templates have them, waiting to be filled in) showed as a bullet reading "[ ]". This
 * turns such items into empty tasks. Positions are untouched, so ticking still edits the text.
 */
type MdNode = {
  type: string
  value?: string
  checked?: boolean | null
  children?: MdNode[]
}

const BOX = /^\[([ xX])\]$/

function walk(node: MdNode) {
  if (node.type === 'listItem' && (node.checked === null || node.checked === undefined)) {
    const [first] = node.children ?? []
    const text =
      first?.type === 'paragraph' && first.children?.length === 1 ? first.children[0] : null
    const m = text?.type === 'text' ? BOX.exec(text.value ?? '') : null
    if (m) {
      node.checked = m[1] !== ' '
      node.children = node.children!.slice(1)
    }
  }
  node.children?.forEach(walk)
}

export function remarkBlankTasks() {
  return (tree: MdNode) => walk(tree)
}
