# Formatted while you type, and more fonts — design

## Intent

Markdown notes should feel like a rich text editor: what you type looks formatted right away,
without switching to Preview. Notes stay plain Markdown, so backups, export, share links,
find, links, sync copies and Format code keep working unchanged. Also: more editor fonts, and
a font per note.

## Approaches

- **A. Formatted while you type (picked by the user).** CodeMirror decorations over the
  existing Markdown parse tree: marks hide when the cursor is away, headings grow, checkboxes
  become clickable. Same text underneath. Medium.
- B. A Word-style editor (TipTap/ProseMirror) storing formatted text. Rejected: every feature
  built on plain text would need rework, and code notes would need a second editor.

## What changes

### 1. Formatted while you type (Markdown notes only)

- `**bold**`, `_italic_`, `~~strike~~`, `` `code` ``: shown styled; the marks are hidden
  except on the line the cursor (or selection) is on, where they show so they can be edited.
- `# Heading` to `######`: larger, bold text; `#` marks hidden away from the cursor line.
- `- item`, `* item`, `+ item`: the mark shows as a bullet `•`. Numbered lists stay as typed.
- `- [ ]` / `- [x]`: a real checkbox; clicking it toggles the `x` in the text (one undo step).
  Done items are struck through and dimmed.
- `> quote`: a bar on the left, `>` hidden away from the cursor.
- `[text](url)`: shows only `text`, as a link; the URL shows on the cursor line. Cmd/Ctrl+click
  opens it in a new tab (`[[note links]]` keep their current behaviour).
- `---` alone on a line: a horizontal rule.
- Fenced code blocks, tables, math, `<details>`: unchanged (already readable as text).
- Only lines in view are decorated, so large notes stay fast.
- A setting, **Settings → Editor → "Format Markdown as you type"**, on by default. Off gives
  today's editor.
- Plain-text and code notes are not affected.

### 2. Keys (Markdown notes, editor focused)

| Keys | Does |
|---|---|
| Cmd/Ctrl+B | Bold |
| Cmd/Ctrl+I | Italic |
| Cmd/Ctrl+Shift+X | Strikethrough |
| Cmd/Ctrl+E | Inline code |
| Cmd/Ctrl+K | Link |
| Cmd/Ctrl+Alt+1 / 2 / 3 / 0 | Heading 1 / 2 / 3 / normal text |
| Cmd/Ctrl+Shift+7 / 8 / 9 | Numbered list / bulleted list / checklist |

Cmd/Ctrl+B toggles the sidebar today. Ruling: inside a Markdown note's editor it bolds;
everywhere else (plain or code notes, focus outside the editor) it still toggles the sidebar.
The shortcuts sheet and palette list both. Existing toolbar buttons gain these keys in their
tooltips. The formatting bar itself already exists and is not redesigned.

### 3. Fonts

- Editor fonts: **Mono, Sans, Serif, Rounded** (was Mono, Sans). All use fonts already on the
  device (no download, works offline):
  - Serif: `Charter, 'Iowan Old Style', Georgia, Cambria, 'Times New Roman', serif`
  - Rounded: `ui-rounded, 'SF Pro Rounded', 'Nunito', 'Segoe UI', system-ui, sans-serif`
- **Per-note font**, like per-note size: the note's menu gets a Font submenu; "Same as
  Settings" clears it. Stored as `Note.font?`, cleaned on backup import and sync like
  `fontSize`. Duplicate copies it.

## Not doing

- Text colour, highlight colour, font per word, underline (not Markdown).
- Rendering images, tables or math inline in the editor.
- Changing Preview.

## Left to the builder

Exact heading sizes, bullet and checkbox styling (match the current theme tokens), the
decoration plugin's structure, and test layout. Must pass the startup budget
(`e2e/first-paint.spec.ts`): the decoration code loads with the Markdown language, not at start.
