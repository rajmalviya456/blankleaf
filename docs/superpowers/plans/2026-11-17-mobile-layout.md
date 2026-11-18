# Phone Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every Blankleaf feature usable and crisp on a phone (< 640px wide) with a note-first layout, without changing the laptop layout.

**Architecture:** A `useIsPhone()` media hook picks between the existing laptop shell and a new `PhoneShell` (top bar · editor · keyboard-docked toolbar). Phone-only overlays (Library, Tabs sheet, Note menu, row-action sheets) live in a small local zustand store with a history-backed "back closes the top overlay" stack. Every existing dialog renders through one `DialogSurface` that is a centred dialog on laptop and a draggable bottom sheet on phone.

**Tech Stack:** React 19, TypeScript, Zustand, Tailwind v4 tokens, Radix (dialog, alert-dialog, dropdown, context-menu), CodeMirror 6, dnd-kit, Vitest + Testing Library, Playwright + axe.

**Spec:** `docs/superpowers/specs/2026-11-17-mobile-layout-design.md`

## Global Constraints

- Phone layout applies at `(max-width: 639px)`; touch fixes apply at `(pointer: coarse)` in either layout.
- Laptop layout and behaviour unchanged; the existing unit and e2e suites stay green untouched (except tests that asserted mouse-only behaviour the spec replaces).
- Every interactive target ≥ 44×44 CSS px on phones (hit area; the icon may be smaller).
- Phone text size: `phoneEditorFontSize`, default 16, range 16–28; inputs/selects are 16px on phones.
- Bars (top bar 48px + toolbar 44px) ≤ ~110px excluding safe-area insets.
- No new runtime dependencies. Phone-only components are lazy-loaded from `PhoneShell`.
- Pinch-zoom stays allowed; `viewport-fit=cover`; use `100dvh` and `env(safe-area-inset-*)`.
- Sheets animate 150–200ms; no animation under `prefers-reduced-motion`.
- Copy (exact strings): "Open tabs", "New note", "Reopen closed tab", "Notes", "Search", "Trash", "Library", "Settings", "What’s new", "About", "Open Library", "Exit zen", "Saving…", "Not saved".
- Playwright phone project: viewport 390×844, `hasTouch: true`, `isMobile: true`, no device preset.

## Review Focus

1. **Keyboard opens while typing near the bottom** → the caret line stays visible above the toolbar; the page never scrolls the top bar away. (Task 5 test: `useKeyboardInset` reports the covered height and `PhoneShell` sets `--kb` so the editor shrinks.)
2. **Rotate or resize to ≥ 640px with a sheet or the Library open** → overlays close, pushed history entries are removed, the laptop layout shows with its own sidebar state. (Task 2 test.)
3. **Pressing Back with nothing open** → normal browser navigation, Blankleaf doesn't swallow it; with an overlay open → only that overlay closes. (Task 2 test.)
4. **Many tabs (30+) or a very long note title** → the Tabs sheet scrolls inside itself, the title truncates with an ellipsis, nothing overflows horizontally at 360px. (Task 6 test + Task 11 overflow e2e.)
5. **A note left in "split" view on the laptop** → shows Edit on the phone, and after toggling Preview on the phone the laptop still shows split. (Task 4 test.)

---

### Task 1: Media hooks, phone text size, page-level CSS

**Files:**
- Create: `src/lib/media.ts`, `src/lib/media.test.ts`
- Modify: `src/domain/types.ts` (Settings), `src/domain/defaults.ts`, `src/features/editor/Editor.tsx`, `src/features/editor/useEditorExtensions.ts`, `src/features/settings/sections/AppearanceSection.tsx`, `index.html`, `src/styles/index.css`
- Test: `src/lib/media.test.ts`, `src/features/editor/Editor.test.tsx`, `src/domain/defaults.test.ts` (existing or new)

**Interfaces:**
- Produces: `useIsPhone(): boolean`, `useIsTouch(): boolean`, `PHONE_QUERY = '(max-width: 639px)'`, `TOUCH_QUERY = '(pointer: coarse)'` in `src/lib/media.ts`; `Settings.phoneEditorFontSize: number`; `PHONE_FONT_MIN = 16`, `PHONE_FONT_MAX = 28` in `src/domain/defaults.ts`; `effectiveEditorFontSize(settings: Settings, phone: boolean): number` in `src/domain/defaults.ts`.

- [ ] **Step 1: Write the failing tests**

```ts
// media.test.ts — matchMedia stub whose listeners can be fired
it('useIsPhone follows (max-width: 639px) live', () => { /* render hook, fire change → true then false */ })
it('useIsTouch follows (pointer: coarse)', () => {})
// defaults.test.ts
expect(DEFAULT_SETTINGS.phoneEditorFontSize).toBe(16)
expect(mergeSettings({ phoneEditorFontSize: 20 }).phoneEditorFontSize).toBe(20)
expect(effectiveEditorFontSize({ ...DEFAULT_SETTINGS, editorFontSize: 13, phoneEditorFontSize: 18 }, true)).toBe(18)
expect(effectiveEditorFontSize({ ...DEFAULT_SETTINGS, editorFontSize: 13 }, false)).toBe(13)
// Editor.test.tsx — with phone media stubbed true, .cm-scroller font-size is 16px though editorFontSize is 14
```

- [ ] **Step 2: Run, expect FAIL** — `npx vitest run src/lib/media.test.ts src/domain src/features/editor` → "useIsPhone is not exported" / undefined setting.

- [ ] **Step 3: Implement.** Hooks use `useSyncExternalStore` over `window.matchMedia(query)` (server/jsdom fallback `false` when `matchMedia` is missing). `Editor` passes `effectiveEditorFontSize(settings, useIsPhone())` into `useEditorExtensions` in place of `editorFontSize`. Appearance section: on phones the "Editor font size" row edits `phoneEditorFontSize` clamped 16–28 and its hint says "On this phone". `index.html` viewport: `width=device-width, initial-scale=1.0, viewport-fit=cover`. CSS: `-webkit-tap-highlight-color: transparent` on `body`; `@media (max-width: 639px) { input, select, textarea { font-size: 16px } }`; wrap existing `:hover` rules in `index.css` in `@media (hover: hover)`; phone gutter: `.cm-gutters` min-width reduced (`@media (max-width: 639px) { .cm-lineNumbers .cm-gutterElement { padding: 0 4px 0 6px } }`). `theme-color`: `applySettingsToDocument` sets `<meta name="theme-color">` to the resolved theme's `--bg` (add test in `src/lib/theme.test.ts`: dark → dark bg value, light → light).

- [ ] **Step 4: Run, expect PASS** — same command, then `npm test`.

- [ ] **Step 5: Commit** — `feat(mobile): detect phones and give them their own text size`

---

### Task 2: Phone overlay store and Back-button handling

**Files:**
- Create: `src/features/phone/phoneStore.ts`, `src/features/phone/useBackToClose.ts`, `src/features/phone/phoneStore.test.ts`

**Interfaces:**
- Produces:
  - `type PhoneOverlay = 'library' | 'tabs' | 'menu' | 'format' | 'shares' | { kind: 'tabActions' | 'noteActions'; noteId: string }`
  - `phoneStore` (zustand vanilla) with state `{ stack: PhoneOverlay[]; librarySection: 'notes' | 'search' | 'trash'; previewByTab: Record<string, boolean> }` and actions `open(o: PhoneOverlay): void`, `close(): void` (top only), `closeAll(): void`, `setLibrarySection(s): void`, `setPreview(noteId: string, on: boolean): void`.
  - `usePhone<T>(selector: (s) => T): T`.
  - `useBackToClose(): void` — mounted once by `PhoneShell`: each `open` pushes `history.pushState({ np: depth }, '')`; `popstate` closes the top overlay; `close()` from UI calls `history.back()` for entries it pushed; `closeAll()` on unmount (layout switch) calls `history.go(-n)` for remaining entries.

- [ ] **Step 1: Failing tests**

```ts
it('open pushes one history entry per overlay and Back closes only the top one')
it('closing with ✕ pops its own history entry (history.length back to start)')
it('Back with no overlay open is not intercepted')            // Review Focus 3
it('unmounting the hook (layout switch) closes all and removes pushed entries') // Review Focus 2
it('setPreview stores per tab and never touches the app store session')     // Review Focus 5 (store half)
```

- [ ] **Step 2: Run, expect FAIL** — `npx vitest run src/features/phone`.
- [ ] **Step 3: Implement** with a module-level counter of entries we pushed so foreign entries (share links' `replaceState`) are never popped.
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** — `feat(mobile): phone overlay stack with back-button support`

---

### Task 3: `DialogSurface` — dialog on laptop, bottom sheet on phone

**Files:**
- Create: `src/ui/DialogSurface.tsx`, `src/ui/DialogSurface.test.tsx`, `src/ui/useDragToClose.ts`
- Modify: `SettingsDialog.tsx`, `AboutDialog.tsx`, `WhatsNewDialog.tsx`, `ImportDialog.tsx`, `CommandPalette.tsx`, `ShortcutsSheet.tsx`, `ShareDialog.tsx`, `ui/ConfirmDialog.tsx`, `features/tabs/TabBar.tsx` (unpin prompt)

**Interfaces:**
- Produces:
  - `DialogSurface(props: { kind?: 'dialog' | 'alert'; title: ReactNode; size?: 'sm' | 'md' | 'lg' | 'full'; footer?: ReactNode; onRequestClose(): void; describedBy?: string; children: ReactNode; className?: string })` — renders `Dialog.Content` (or `AlertDialog.Content` for `kind: 'alert'`) with the current laptop classes on laptop; on phone: fixed bottom sheet, full width, `max-height: calc(var(--vvh, 100dvh) * 0.92)`, rounded top, drag handle, sticky header (title + ✕ 44px), scrolling body, footer pinned with `padding-bottom: env(safe-area-inset-bottom)`.
  - `useDragToClose(ref, onClose): { handleProps }` — pointer events on the handle/header only; closes when dragged > 80px or flung > 0.5px/ms; otherwise springs back.
- Each dialog keeps its own `Dialog.Root` and state; only its `Content` is swapped for `DialogSurface`.

- [ ] **Step 1: Failing tests**

```ts
it('renders centred dialog classes on laptop (data-surface="dialog")')
it('renders a bottom sheet on phone (data-surface="sheet") with a 44px close button named "Close"')
it('dragging the handle down 100px calls onRequestClose; 30px does not')
it('footer stays outside the scrolling body')
// each converted dialog: one existing test re-run under phone media still finds its role=dialog by name
```

- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** and convert the nine surfaces. Command palette uses `size="full"` (input on top). Confirm dialogs use `size="sm"`.
- [ ] **Step 4: Run, expect PASS** — `npm test` and `npx playwright test` (laptop suite unchanged).
- [ ] **Step 5: Commit** — `feat(mobile): show dialogs as bottom sheets on phones`

---

### Task 4: `PhoneShell`, top bar and Edit/Preview toggle

**Files:**
- Create: `src/features/phone/PhoneShell.tsx`, `src/features/phone/PhoneTopBar.tsx`, `src/features/phone/PhoneShell.test.tsx`
- Modify: `src/app/App.tsx` (choose shell), `src/app/layout/EditorArea.tsx` (accept view override)

**Interfaces:**
- Consumes: `useIsPhone`, `phoneStore`, `usePhone`, `useBackToClose`.
- Produces:
  - `EditorArea({ viewOverride?: 'edit' | 'preview' })` — when set, overrides `session.perTab[id].previewMode` for rendering only.
  - `phoneViewFor(noteId, s): 'edit' | 'preview'` — `previewByTab[id]` if set, else `'preview'` when saved mode is preview, else `'edit'`.
  - `PhoneShell` layout: `PhoneTopBar` / `EditorArea viewOverride` / `PhoneToolbarDock` (Task 5) / lazy overlays (Tasks 6–8); height `100dvh`, top padding `env(safe-area-inset-top)`.
  - `PhoneTopBar` buttons (accessible names): "Library" (☰), title button named `Open tabs: <title>` (shows "Blankleaf" with no note), "Preview"/"Edit" toggle (Markdown only), "Note menu" (⋯). A small accent dot (aria-hidden; buttons' names gain " · sharing") on "Library" and "Note menu" while any share is active. Under the title: "Saving…" while saving; "Not saved" button (opens a toast with the error) on error; nothing when saved.
- App: `useIsPhone() ? <PhoneShell /> : <existing layout>`; `Dialogs`, `Toaster`, shortcuts and reminders stay shared.

- [ ] **Step 1: Failing tests**

```ts
it('phone media → top bar, no tab strip, rail or status bar')
it('laptop media → existing layout untouched')
it('title shows display title and opens the Tabs sheet; "Blankleaf" with no open note plus a "New note" button')
it('Preview toggle only for markdown; a split note shows Edit; toggling never changes session.perTab.previewMode') // Review Focus 5
it('save state text: hidden when saved, "Saving…" when saving, "Not saved" button on error')
it('sharing dot on Library and Note menu only while a share is active')
```

- [ ] **Step 2: Run, expect FAIL.** - [ ] **Step 3: Implement.** - [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** — `feat(mobile): note-first phone shell with top bar`

---

### Task 5: Toolbar docked above the keyboard

**Files:**
- Create: `src/features/phone/useKeyboardInset.ts`, `src/features/phone/PhoneToolbarDock.tsx`, tests beside them
- Modify: `src/features/toolbar/Toolbar.tsx`

**Interfaces:**
- Produces:
  - `useKeyboardInset(): number` — px of layout viewport covered by the on-screen keyboard: `max(0, innerHeight - visualViewport.height - visualViewport.offsetTop)`, updated on `visualViewport` resize/scroll; 0 without `visualViewport`.
  - `Toolbar({ noteId, compact?: boolean })` — `compact` hides text size and the right-hand group (copy, download, share, trash); buttons get `min-h-11 min-w-11` on phone.
  - `PhoneToolbarDock` — positions the toolbar at `bottom: max(kb, env(safe-area-inset-bottom))`, sets CSS var `--kb` on the shell so the editor area's bottom padding equals toolbar height + kb; horizontal scroll with left/right fade masks and a trailing "More tools" › button that scrolls by one viewport width when overflowing. Hidden in preview and zen; respects `showToolbar`.

- [ ] **Step 1: Failing tests**

```ts
it('useKeyboardInset reports covered height from a mocked visualViewport and 0 without it')
it('dock sets --kb and stays above the keyboard')                       // Review Focus 1
it('compact toolbar has no Copy/Download/Share/Trash/Larger text buttons')
it('"More tools" appears only when the row overflows and scrolls it')
it('hidden in Preview and in zen')
```

- [ ] **Step 2–4: RED → implement → GREEN.**
- [ ] **Step 5: Commit** — `feat(mobile): keep the toolbar above the keyboard`

---

### Task 6: Tabs sheet and tab actions

**Files:**
- Create: `src/features/phone/TabsSheet.tsx`, `src/features/phone/ActionSheet.tsx`, `src/features/phone/TabsSheet.test.tsx`

**Interfaces:**
- Consumes: `DialogSurface`, `phoneStore`, store actions (`setActive`, `closeTab`, `renameNote`, `togglePin`, `duplicateNote`, `closeOthers`, `closeToRight`, `trashNote`, `moveTab`, `newNote`, `reopenClosedTab`), `shareStore.open`, `exportNote`, `orderedTabs`, `displayTitle`.
- Produces:
  - `ActionSheet({ title: string; items: { label: string; icon?: LucideIcon; danger?: boolean; disabled?: boolean; onSelect(): void }[] })` — DialogSurface sheet listing 48px rows; selecting closes it first.
  - `TabsSheet` — opened by overlay `'tabs'`; list `role="listbox"` named "Open tabs", options named by title, pinned first with pin icon, active `aria-selected`; per row: "Close <title>" ✕ (pinned → same unpin prompt as laptop), "Actions for <title>" ⋯ (and 500ms long-press) → `{kind:'tabActions'}` ActionSheet with: Rename, Pin/Unpin, Duplicate, Share…, Copy text, Download, Close, Close others, Close tabs below, Move to Trash; drag handle "Reorder <title>" (dnd-kit `TouchSensor` delay 200ms tolerance 5 + `KeyboardSensor`). Footer: "New note", "Reopen closed tab" (disabled when `closedStack` empty). Inline rename: 16px input, Enter/blur commits, Esc cancels.

- [ ] **Step 1: Failing tests**

```ts
it('tapping a row activates it and closes the sheet')
it('every laptop tab-menu action is reachable from the row actions')
it('closing a pinned tab asks to unpin')
it('rename inline: Enter commits, Escape cancels')
it('keyboard reorder via the handle calls moveTab')
it('30 tabs and a 200-char title: list scrolls, row text truncates')   // Review Focus 4
it('Reopen closed tab disabled when nothing was closed')
```

- [ ] **Step 2–4: RED → implement → GREEN.**
- [ ] **Step 5: Commit** — `feat(mobile): tabs sheet with every tab action`

---

### Task 7: Library (Notes · Search · Trash) and active shares

**Files:**
- Create: `src/features/phone/Library.tsx`, `src/features/phone/Library.test.tsx`, `src/features/share/ActiveSharesList.tsx`
- Modify: `src/features/sidebar/NotesList.tsx`, `SearchPanel.tsx`, `TrashPanel.tsx` (accept `onOpened?(): void` and `touch?: boolean`), `src/features/share/SharesIndicator.tsx` (use `ActiveSharesList`)

**Interfaces:**
- Produces:
  - `Library` — full-screen panel (overlay `'library'`), slides from left, header: "Close Library" ‹ button + segmented `role="tablist"` Notes | Search | Trash bound to `librarySection`; footer rows: "Settings", "What’s new", "About", theme cycle button "Theme: <pref>", and when shares are active "Sharing N notes · m:ss" opening overlay `'shares'`.
  - `ActiveSharesList({ shares: ShareRow[] })` — extracted list markup from `SharesIndicator`, reused by the popover and the `'shares'` sheet.
  - Panels: `onOpened` is called after opening a note (Library closes). With `touch`, NotesList rows show an always-visible "Actions for <title>" ⋯ (and long-press) → `{kind:'noteActions'}` ActionSheet: Open, Pin/Unpin, Share…, Download, Move to Trash (with the existing Undo toast); TrashPanel rows show "Restore <title>" visibly and "Delete <title> permanently" in ⋯.

- [ ] **Step 1: Failing tests**

```ts
it('☰ opens Library on Notes; tapping a note opens it and closes Library')
it('Search tab focuses the 16px search box; tapping a result reveals the match')
it('Trash: Restore visible; permanent delete via ⋯ asks to confirm')
it('note row ⋯ → Move to Trash shows Undo toast; note never opened')
it('footer opens Settings / What’s new / About; theme button cycles')
it('active shares row appears only while sharing and opens the shares sheet')
```

- [ ] **Step 2–4: RED → implement → GREEN** (laptop sidebar tests still pass).
- [ ] **Step 5: Commit** — `feat(mobile): full-screen library for notes, search and trash`

---

### Task 8: Note menu, format list, find panel, zen pill

**Files:**
- Create: `src/features/phone/NoteMenu.tsx`, `src/features/phone/FormatSheet.tsx`, `src/features/phone/NoteMenu.test.tsx`
- Modify: `src/app/layout/ZenExitHint.tsx`, `src/styles/index.css` (find panel), `src/features/editor/FormatPicker.tsx` (export its option list as `FORMAT_GROUPS` if not already exported)

**Interfaces:**
- Consumes: `textStats`, `lineColAt` (`src/lib/textStats`), `openSearchPanel`, `getActiveView`, `PHONE_FONT_MIN/MAX`.
- Produces:
  - `NoteMenu` (overlay `'menu'`) sections in this order: "Format: <label>" › (opens `'format'`), "Wrap lines" switch; "Text size" − value + (edits `phoneEditorFontSize`), "Find & replace"; "Share…", "Copy all text", "Download", "Duplicate", "Pin"/"Unpin", "Rename"; "Zen mode", "Commands…"; "Move to Trash" (danger). Footer text: `Ln {line}, Col {col} · {words} words · {chars} chars` (words omitted for large notes, matching the status bar's rule).
  - `FormatSheet` — search input on top, grouped list from `FORMAT_GROUPS`, selecting sets the language and closes.
  - Zen on phone: `ZenExitHint` renders a persistent 44px "Exit zen" pill top-right (laptop keeps the Esc hint).
  - Find panel CSS under `@media (max-width: 639px)`: rows stack, inputs 16px, buttons 40px.

- [ ] **Step 1: Failing tests**

```ts
it('menu lists every action in order and runs each (share opens dialog, copy writes clipboard, trash moves note)')
it('text size − / + clamps to 16–28 and leaves editorFontSize unchanged')
it('footer shows line, column, words and chars for the active note')
it('format sheet filters by typing and sets the language')
it('zen on phone shows "Exit zen" which leaves zen')
```

- [ ] **Step 2–4: RED → implement → GREEN.**
- [ ] **Step 5: Commit** — `feat(mobile): note menu with format, size and note actions`

---

### Task 9: Palette on phones, toasts, and touch fixes for the laptop layout

**Files:**
- Modify: `src/commands/registry.ts`, `src/ui/Toaster.tsx`, `src/features/tabs/TabItem.tsx`, `src/features/tabs/TabBar.tsx`, `src/features/tabs/TabContextMenu.tsx`, `src/features/sidebar/NotesList.tsx`
- Test: `src/commands/registry.test.ts`, `src/ui/Toaster.test.tsx`, `src/features/tabs/TabBar.test.tsx`

**Interfaces:**
- Produces:
  - `CommandContext` gains `phone: boolean`; `Command.when?(s, ctx?)`. Phone: hide `view.sidebar`; add `library.open` "Open Library" (phone only); `view.preview.cycle` titled "Markdown: edit / preview" toggles `phoneStore.setPreview`.
  - Toaster on phone: full width minus 12px, above `--kb` and safe area, action buttons 44px.
  - Touch fixes (`useIsTouch()`): tab close ✕ always visible; tabs use `TouchSensor` (delay 200, tolerance 5) instead of the pointer distance sensor; long-press (500ms) on a tab opens its context menu if Radix doesn't on that platform; NotesList shows the ⋯ row button from Task 7 instead of the hover trash.

- [ ] **Step 1: Failing tests**

```ts
it('palette on phone hides Toggle sidebar and shows Open Library')
it('preview command toggles phone view on phone and cycles split on laptop')
it('touch: tab close button visible without hover')
it('touch: notes list shows Actions button, not hover trash')
it('toasts on phone sit above the keyboard inset')
```

- [ ] **Step 2–4: RED → implement → GREEN.**
- [ ] **Step 5: Commit** — `feat(mobile): touch-friendly tabs, lists, toasts and palette`

---

### Task 10: Share recipient page and Markdown preview on phones

**Files:**
- Modify: `src/features/share/ShareView.tsx`, `src/styles/index.css` (`.md-preview` phone padding 16px, `table` wrapper scroll, `img { max-width: 100% }`, `pre` scroll)
- Test: `src/features/share/ShareView.test.tsx`

**Interfaces:**
- Produces: ShareView ready header on phone: banner text on its own line(s), buttons row below ("Preview"/"Show source", "Download", "Save to my notes", "Close") each ≥ 44px; password input 16px.

- [ ] **Step 1: Failing test** — `it('phone: banner and actions stack; all action buttons present and ≥44px (class check)')`.
- [ ] **Step 2–4: RED → implement → GREEN.**
- [ ] **Step 5: Commit** — `feat(mobile): fit shared notes and previews on phones`

---

### Task 11: Phone end-to-end, accessibility and docs

**Files:**
- Modify: `playwright.config.ts` (add project `phone`: `testMatch: /.*\.phone\.spec\.ts/`, viewport 390×844, `hasTouch`, `isMobile`; laptop project `testIgnore` the same pattern), `e2e/helpers.ts` (`openPhoneApp`), `README.md` (Features: "Works on phones" line), `CHANGELOG` untouched
- Create: `e2e/phone.phone.spec.ts`, `e2e/phone-a11y.phone.spec.ts`

- [ ] **Step 1: Write e2e tests**

```ts
test('write, format and switch tabs on a phone')          // new note, type, Bold via toolbar, open tabs via title, switch
test('library: open a note, trash one with Undo')
test('markdown preview toggle and back button closes sheets') // page.goBack() closes Tabs sheet, then nothing more
test('share dialog opens as a sheet and creates a link')
test('settings: change phone text size; laptop size unchanged after resizing to 1280')
test('no horizontal overflow at 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 })
  for (const open of [noOverlay, tabsSheet, library, noteMenu, settings])
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
})
test('bars ≤ 110px', async ({ page }) => { /* top bar height + toolbar height */ })
for (const scheme of ['light', 'dark']) test(`axe phone (${scheme})`, …) // main, Tabs sheet, Library, Note menu
```

- [ ] **Step 2: Run** — `npx playwright test --project=phone` → expect failures only where a gap remains; fix in the owning task's files.
- [ ] **Step 3: Run the full gate** — `npm test && npm run lint && npm run typecheck && npm run format:check && npm run build && npx playwright test` → all green (laptop + phone projects).
- [ ] **Step 4: Manual pass** (record results in the PR): iOS Safari and Android Chrome, in the browser and installed — keyboard open/close with toolbar, rotate with a sheet open, Back gesture, safe areas, long-press menus.
- [ ] **Step 5: Commit** — `test(mobile): phone end-to-end and accessibility checks` and `docs: mention phone support`
