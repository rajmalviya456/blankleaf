# Formatted while you type, shortcuts and fonts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Markdown notes look formatted while typing, get Word-style shortcuts, and every note can use one of four editor fonts.

**Architecture:** A lazy CodeMirror ViewPlugin (`liveMarkdown.ts`) decorates the visible Markdown syntax tree; a keymap (`markdownKeys.ts`) reuses `toolbar/editCommands.ts`. Fonts become a four-value setting plus an optional per-note override mirroring per-note font size.

**Tech Stack:** CodeMirror 6 (`@codemirror/view`, `@codemirror/language`, `@lezer/markdown` tree from `@codemirror/lang-markdown`), React 19, Zustand, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-20-live-markdown-design.md`

## Global Constraints

- Notes stay plain Markdown: no change to stored text except what the user's own edits make.
- Only notes whose language is `markdown` get decorations and the keymap.
- Fonts use only fonts already on the device (no download).
- Startup budget in `e2e/first-paint.spec.ts` (under 360 KB gzipped) must still pass: decoration code is not in the startup chunk.
- Each toolbar/keyboard edit is one transaction (one undo step).

## Rulings (from reading the code)

- Cmd/Ctrl+K already opens the command palette (welcome note, registry). Link becomes **Cmd/Ctrl+Shift+K**; the palette keeps Cmd/Ctrl+K. Cost if wrong: one more key to learn.
- Cmd/Ctrl+B sidebar toggle runs in the window capture phase before CodeMirror. Add `yieldsToMarkdown` to `Shortcut`, skipped when the key's target is inside a CodeMirror editor whose language is Markdown.

## Review Focus

1. Cursor inside hidden marks: moving the cursor onto a line must reveal that line's marks, or editing becomes impossible. Test: decorations on the selection line are absent.
2. Checkbox click must change only the `[ ]`/`[x]` characters and keep the cursor/scroll. Test in liveMarkdown tests.
3. Cmd+B in a plain or code note still toggles the sidebar. Test in shortcut tests.
4. Old settings or backups with an unknown `editorFont` or `note.font` fall back safely. Tests for `mergeSettings` and `cleanNoteFont`.
5. Very large notes (`isLargeDoc`) skip decorations to stay fast. Test: no plugin when large.

---

### Task 1: Fonts — four editor fonts and per-note font

**Files:**
- Modify: `src/domain/types.ts` (`EditorFont = 'mono' | 'sans' | 'serif' | 'rounded'`; `Settings.editorFont: EditorFont`; `Note.font?: EditorFont`)
- Modify: `src/domain/defaults.ts` (`EDITOR_FONTS`, `cleanNoteFont(raw): EditorFont | undefined`, `effectiveEditorFont(s, note?)`, `editorFontStack(font): string`; `mergeSettings` resets unknown fonts to `'mono'`)
- Modify: `src/styles/index.css` (`--font-serif`, `--font-rounded`, stacks from spec)
- Modify: `src/store/store.ts` (`setNoteFont(id, font | undefined)`; Settings font → undefined; duplicate copies `font`)
- Modify: `src/features/backup/backup.ts` (cleanNote keeps `font`), `src/features/sync/sync.ts` (conflict copy keeps `font`)
- Create: `src/features/editor/useNoteFont.ts`
- Modify: `useEditorExtensions.ts`, `Editor.tsx`, `LockedNote.tsx`, `EditorArea.tsx` Preview (use `editorFontStack`)
- Modify: `AppearanceSection.tsx` (4 options), `Toolbar.tsx` (Font menu by text size, laptop), `phone/NoteMenu.tsx` (Font row cycling via a small segmented/list)
- Test: `src/domain/defaults.test.ts`, `src/store/store.test.ts`, `src/features/backup/backup.test.ts`, Toolbar test

**Interfaces — Produces:** `type EditorFont`, `editorFontStack(font: EditorFont): string`, `effectiveEditorFont(s: Pick<Settings,'editorFont'>, note?: Pick<Note,'font'>): EditorFont`, `useNoteFont(noteId): EditorFont`, store `setNoteFont(id: string, font: EditorFont | undefined): void`.

- [ ] Tests first: `mergeSettings({editorFont:'comic'}).editorFont === 'mono'`; `cleanNoteFont('serif') === 'serif'`, `cleanNoteFont('x') === undefined`; `setNoteFont(id,'serif')` stores it, `setNoteFont(id, settings.editorFont)` clears it; duplicate keeps font; `parseBackup` keeps `font:'rounded'` and drops `font:'x'`; toolbar Font menu sets the note's font. Run, see fail.
- [ ] Implement, run tests, pass. Commit `feat: serif and rounded editor fonts, and a font per note`.

### Task 2: Markdown shortcuts

**Files:**
- Create: `src/features/editor/markdownKeys.ts` — `markdownKeys: Extension` = `Prec.high(keymap.of([...]))`: `Mod-b` bold `**`, `Mod-i` italic `_`, `Mod-Shift-x` strike `~~`, `Mod-e` code `` ` ``, `Mod-Shift-k` link, `Mod-Alt-1/2/3/0` heading, `Mod-Shift-7/8/9` numbered/bulleted/checklist (use `toolbar/editCommands.ts`)
- Modify: `languages.ts` markdown loader adds `markdownKeys`
- Modify: `src/lib/shortcuts.ts` (`yieldsToMarkdown?: boolean`), `useGlobalShortcuts.ts` (`typingInMarkdown(e)` via `EditorView.findFromDOM` + `language` facet name `'markdown'`), `registry.ts` sidebar shortcut gets `yieldsToMarkdown: true`
- Modify: `ShortcutsSheet` list, Toolbar button labels add the key (e.g. `Bold (⌘B)`)
- Test: `src/features/editor/markdownKeys.test.ts`, `useGlobalShortcuts` test

- [ ] Tests first: in a markdown EditorState+View with `hello` selected, running the `Mod-b` binding gives `**hello**`; `Mod-Alt-2` on a line gives `## `; `Mod-Shift-9` gives `- [ ] `; global Cmd+B with target in a Markdown editor does not toggle the sidebar, in a plain editor it does. Run, see fail.
- [ ] Implement, pass. Commit `feat: Markdown formatting shortcuts`.

### Task 3: Formatted while you type

**Files:**
- Create: `src/features/editor/liveMarkdown.ts` — `liveMarkdown: Extension` (ViewPlugin over `view.visibleRanges`, `syntaxTree`), plus theme classes
- Modify: `src/domain/types.ts` + `defaults.ts` (`Settings.liveMarkdown: boolean`, default `true`)
- Modify: `Editor.tsx` — `useLiveMarkdown(enabled: boolean)` lazy-imports `./liveMarkdown`; enabled when `lang === 'markdown' && settings.liveMarkdown && !large`
- Modify: `src/features/settings/sections/` editor section — switch "Format Markdown as you type"
- Test: `src/features/editor/liveMarkdown.test.ts`, e2e `e2e/live-markdown.spec.ts`

**Behaviour (lines = any line touched by a selection range are "active"):**
- `EmphasisMark`, `StrikethroughMark` (`~~`), `CodeMark` (inline only, parent `InlineCode`), `HeaderMark` (+ following space), `QuoteMark` (+ space), `LinkMark` and `URL` inside `Link` (not `[[...]]`): hidden (`Decoration.replace`) on inactive lines.
- `ATXHeading1..6`: line class `cm-md-h1..h6` always.
- `ListMark` of `-*+` (not ordered, not task): replaced by bullet widget `•` on inactive lines.
- `Task` `TaskMarker`: checkbox widget always (on active line too, after the list mark); click dispatches one change toggling ` `↔`x`, `userEvent: 'input.toggle'`; done task line gets `cm-md-done`.
- `Blockquote` lines: line class `cm-md-quote` always.
- `HorizontalRule` on inactive line: replaced by `hr` widget.
- `InlineCode`: mark class `cm-md-code` always.
- Link text: mark class `cm-md-link`; Mod-click opens the URL with `window.open(url,'_blank','noopener')` only for `http(s):`/`mailto:` URLs.

- [ ] Tests first (jsdom EditorView with markdown language loaded synchronously): inactive `**bold**` line has `**` hidden; cursor line shows them; `# Title` line has `cm-md-h1`; clicking checkbox turns `- [ ] a` into `- [x] a`, one undo restores; `liveMarkdown` off → no `cm-md-*`; `javascript:` link not opened. Run, see fail.
- [ ] Implement, pass. E2E: type `**hi** ` then Enter, line shows bold without `**`. Commit `feat: format Markdown as you type`.

### Task 4: Verify and ship
- [ ] `npm run format:check`, eslint, `tsc -b`, vitest, playwright (incl. first-paint budget). PR with `BEGIN_COMMIT_OVERRIDE`, CI, merge, release PR, verify live.
