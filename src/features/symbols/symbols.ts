/** Symbols and emoji people type often but can't find on a keyboard, with names to search by. */
export interface Sym {
  char: string
  name: string
  /** Extra words to find it by. */
  tags?: string[]
  /** The same emoji in skin tones 1 (light) to 5 (dark), if it has them. */
  skins?: string[]
}

const group = (
  id: string,
  label: string,
  list: string,
): { id: string; label: string; items: Sym[] } => ({
  id,
  label,
  items: list
    .trim()
    .split('\n')
    .map((line) => {
      const [char, ...name] = line.trim().split(' ')
      return { char, name: name.join(' ') }
    }),
})

export const SYMBOL_GROUPS = [
  group(
    'arrows',
    'Arrows',
    `
→ right arrow
← left arrow
↑ up arrow
↓ down arrow
↔ left right arrow
⇒ double right arrow
⇐ double left arrow
⇔ double left right arrow
↗ up right arrow
↘ down right arrow
↩ return arrow
⟶ long right arrow`,
  ),
  group(
    'maths',
    'Maths',
    `
± plus minus
× times multiply
÷ divide
≈ almost equal approximately
≠ not equal
≤ less than or equal
≥ greater than or equal
∞ infinity
√ square root
∑ sum sigma
π pi
° degree
% percent
‰ per mille
½ half
⅓ one third
¼ quarter
¾ three quarters
² squared superscript two
³ cubed superscript three
µ micro`,
  ),
  group(
    'money',
    'Money',
    `
€ euro
£ pound
¥ yen yuan
₹ rupee
¢ cent
₩ won
₽ ruble
₿ bitcoin`,
  ),
  group(
    'typography',
    'Typography',
    `
— em dash
– en dash
… ellipsis
• bullet
· middle dot
“ left double quote
” right double quote
‘ left single quote
’ right single quote apostrophe
« left angle quote guillemet
» right angle quote guillemet
§ section
¶ paragraph pilcrow
† dagger
© copyright
® registered
™ trademark
№ numero number`,
  ),
  group(
    'marks',
    'Marks',
    `
✓ check mark tick
✔ heavy check mark
✗ cross mark
✘ heavy cross
★ black star
☆ white star
♥ heart
⚠ warning
⚡ lightning
☐ empty box
☑ checked box
● circle
○ white circle
■ square
◆ diamond
♪ music note
☀ sun
☁ cloud
☂ umbrella
☎ telephone
✉ envelope
⌘ command key
⌥ option key
⇧ shift key
⏎ return key`,
  ),
]

const wordsOf = (s: Sym) => [
  ...s.name.toLowerCase().split(/[\s:,]+/),
  ...(s.tags ?? []).map((t) => t.toLowerCase()),
]

/**
 * Symbols (and any extra, such as emoji) whose name, keywords or the character itself match
 * every word typed, best first.
 */
export function findSymbols(query: string, extra: Sym[] = []): Sym[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const words = q.split(/\s+/)
  const all = [...SYMBOL_GROUPS.flatMap((g) => g.items), ...extra]
  const hits = all.filter((s) => {
    if (s.char === q) return true
    const own = wordsOf(s)
    return words.every((w) => own.some((n) => n.startsWith(w)))
  })
  // Names that start with what's typed first; otherwise keep the list's order.
  return hits
    .map((s, i) => ({ s, i, rank: Number(!s.name.toLowerCase().startsWith(q)) }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map((h) => h.s)
}
