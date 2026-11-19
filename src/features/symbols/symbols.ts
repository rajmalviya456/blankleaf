/** Symbols and emoji people type often but can't find on a keyboard, with names to search by. */
export interface Sym {
  char: string
  name: string
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
  group(
    'emoji',
    'Emoji',
    `
😀 grinning face
😂 tears of joy
🙂 slightly smiling face
😉 winking face
😍 heart eyes
🤔 thinking face
😅 sweat smile
😎 cool sunglasses
😢 crying face
😡 angry face
😴 sleeping face
🤯 mind blown
🥳 party face
👍 thumbs up
👎 thumbs down
👏 clapping hands
🙏 folded hands please thanks
💪 flexed biceps strong
👋 waving hand
👀 eyes
❤️ red heart
🔥 fire
✨ sparkles
⭐ star
🎉 party popper celebrate
🚀 rocket
💡 light bulb idea
✅ check mark button done
❌ cross mark
❓ question mark
❗ exclamation mark
⚠️ warning sign
📌 pushpin
📎 paperclip
📝 memo note
📅 calendar
⏰ alarm clock
📚 books
💻 laptop
📱 mobile phone
☕ coffee
🍕 pizza
🎯 direct hit target
🏆 trophy
💰 money bag
🛒 shopping cart
🏠 house home
✈️ airplane travel
🌍 globe earth
🐛 bug
🔒 locked
🔑 key
🔗 link`,
  ),
]

/** Symbols whose name (or the character itself) matches every word typed, best first. */
export function findSymbols(query: string): Sym[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const words = q.split(/\s+/)
  const all = SYMBOL_GROUPS.flatMap((g) => g.items)
  const hits = all.filter(
    (s) => s.char === q || words.every((w) => s.name.split(' ').some((n) => n.startsWith(w))),
  )
  // Names that start with what's typed first.
  return hits.sort((a, b) => Number(!a.name.startsWith(q)) - Number(!b.name.startsWith(q)))
}
