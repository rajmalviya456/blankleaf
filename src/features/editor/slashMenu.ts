/**
 * The "/" menu for Markdown notes: type `/` at the start of a line to insert a heading, list,
 * checklist, quote, code block, table, divider or today's date. It writes plain Markdown, in
 * one undo step. Loaded with the Markdown language.
 */
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete'
import { syntaxTree } from '@codemirror/language'
import type { Extension } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { completionCore, completionSources } from './completion'

interface SlashItem {
  label: string
  detail: string
  /** Text to insert, and where the cursor goes in it (the end when absent). */
  text: () => { text: string; cursor?: number }
}

const pad = (n: number) => String(n).padStart(2, '0')
function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const TABLE = '| Column | Column |\n| ------ | ------ |\n|        |        |'
const plain = (text: string) => () => ({ text })

export const SLASH_ITEMS: readonly SlashItem[] = [
  { label: 'Heading 1', detail: '#', text: plain('# ') },
  { label: 'Heading 2', detail: '##', text: plain('## ') },
  { label: 'Heading 3', detail: '###', text: plain('### ') },
  { label: 'Bulleted list', detail: '-', text: plain('- ') },
  { label: 'Numbered list', detail: '1.', text: plain('1. ') },
  { label: 'Checklist', detail: 'to-do', text: plain('- [ ] ') },
  { label: 'Quote', detail: '>', text: plain('> ') },
  { label: 'Code block', detail: '```', text: () => ({ text: '```\n\n```', cursor: 4 }) },
  // The cursor lands in the first empty cell; Tab moves on and tidies the table.
  {
    label: 'Table',
    detail: '| |',
    text: () => ({ text: TABLE, cursor: TABLE.lastIndexOf('\n') + 3 }),
  },
  { label: 'Divider', detail: '---', text: plain('---\n') },
  { label: 'Today’s date', detail: 'yyyy-mm-dd', text: () => ({ text: today() }) },
]

function insert(item: SlashItem) {
  return (view: EditorView, _c: Completion, from: number, to: number) => {
    const { text, cursor = text.length } = item.text()
    // `from` is just after the slash: the slash goes too.
    view.dispatch({
      changes: { from: from - 1, to, insert: text },
      selection: { anchor: from - 1 + cursor },
      userEvent: 'input.complete',
    })
  }
}

const OPTIONS: Completion[] = SLASH_ITEMS.map((item, i) => ({
  label: item.label,
  // Listed in this order, not A–Z.
  sortText: String(i).padStart(2, '0'),
  detail: item.detail,
  type: 'text',
  apply: insert(item),
}))

const IN_CODE = new Set(['FencedCode', 'CodeBlock', 'CodeText', 'InlineCode', 'HTMLBlock'])

/** Suggestions for `/…` typed at the start of a line (after any indent), outside code. */
export function slashSource(context: CompletionContext): CompletionResult | null {
  const typed = context.matchBefore(/\/[\p{L}\p{N} ’'-]*$/u)
  if (!typed) return null
  const line = context.state.doc.lineAt(typed.from)
  if (line.text.slice(0, typed.from - line.from).trim()) return null
  for (
    let n: ReturnType<typeof syntaxTree>['topNode'] | null = syntaxTree(context.state).resolveInner(
      typed.from,
      -1,
    );
    n;
    n = n.parent
  )
    if (IN_CODE.has(n.name)) return null
  return { from: typed.from + 1, options: OPTIONS, validFor: /^[\p{L}\p{N} ’'-]*$/u }
}

export const slashMenu: Extension = [completionCore, completionSources.of(slashSource)]
