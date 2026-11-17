# Editor toolbar — design (short)

**Why:** users coming from simple online notepads expect a visible toolbar for common edits
(bold, headings, lists, case changes, copy/download) instead of hunting for shortcuts or the palette.

**Goals:** one row between the tabs and the editor; adapts to the active note's format; every
button is a plain CodeMirror transaction (so ⌘Z undoes it); keyboard and screen-reader friendly.

**Non-goals:** rich text (underline, colours, alignment) — notes are plain text or Markdown and
have no place to store it. No per-note toolbar config.

**Anti-goals:** buttons that scatter `**` / `#` through code or logs; a toolbar that shows when
there is nothing to act on.

## Approaches

- **A — adapts to format (picked).** Markdown notes get the formatting group (heading ▾, bold,
  italic, strike, inline code, link, list ▾, quote, code block). Plain/code/log notes get a text
  group (case ▾, lines ▾ sort/dedupe/trim, insert date/time, wrap). Both get undo/redo, font
  size −/+, find, and on the right copy all, download, share, trash.
- B — same toolbar everywhere; formatting a plain note converts it to Markdown. Rejected: risky
  for code and logs, the main non-prose use.

## Decisions

- Shown only when a note is open; hidden in zen; Settings › Editor › "Show toolbar" (default on)
  and a palette command "Toggle toolbar".
- Editing buttons act on the selection; with no selection, bold/italic/etc. insert the markers
  around the cursor, line commands act on the whole note, case acts on the current word.
- While a Markdown note is in preview-only view, editing buttons are disabled.
- Font size −/+ changes the global editor font size (10–28), same as Settings.
- Formatting shortcuts: none new. ⌘B is already "Toggle sidebar"; rebinding it is a separate
  decision (my call — recorded so it can be revisited).
- Narrow windows: the row scrolls horizontally rather than wrapping.

Left to the builder: icon choice (lucide), exact toolbar markup, tests.
