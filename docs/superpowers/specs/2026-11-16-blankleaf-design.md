# Blankleaf — Design

Date: 2026-11-16
Status: Draft, awaiting approval

## 1. Intent

Blankleaf is a browser notepad that uses the **whole window** for writing, has **tabs**, and
**restores your session** exactly as you left it. There is **no backend and no database server**.
Every note stays on the user's machine.

It has to cover three uses equally well:

- **Quick throwaway scratch** while working: open, type, done. Zero friction.
- **Code snippets and logs**: syntax highlighting, monospace, big pastes, wrap toggle.
- **Long-lived notes** kept for weeks: naming, pinning, search, recovery.

Why it exists: existing online notepads (onlinenotepad.org, edit-pad, dontpad, notepad.pw,
protectedtext) share the same problems. They waste space with ads and small textareas, have no
real tabs or clunky ones, store data fragilely in `localStorage` (about a 5MB cap, silent loss), can't
undo a closed tab, can't search across notes, and look dated with weak dark mode and few shortcuts.
Blankleaf should feel like a modern, calm, fast desktop tool that lives in a browser tab.

## 2. Goals, non-goals, anti-goals

**Goals**
- The editor fills the viewport. The UI chrome is minimal and can be hidden entirely (zen mode).
- Tabs: create, close, switch, rename, reorder (drag), pin.
- Session restore: the open tabs, tab order, active tab, cursor, selection and scroll position per
  tab, the sidebar state and settings all survive reloads and browser restarts.
- Autosave on every change. A save indicator is always visible (except in zen mode).
- Per-note text mode: Plain text (default) or Markdown with a live preview. Each tab can also carry
  a language for syntax highlighting.
- Search across all notes. Trash with restore.
- Export/import of all data, so the user can back up and move between origins or machines.
- A PWA you can install, that works offline, deployed to GitHub Pages.
- Excellent keyboard UX: command palette (`⌘K` / `Ctrl+K`) and shortcuts for every main action.
- Light and dark themes in the "Calm" style, following the system by default.
- A meaningful git history: one logical change per commit, Conventional Commits.

**Non-goals (v1)**
- Accounts, cloud sync, sharing or collaboration.
- Rich text / WYSIWYG formatting (bold buttons, Word-style editing).
- Encryption at rest.
- Linking a real folder on disk via the File System Access API. This is planned as a **later phase**
  (option B from brainstorming) and the storage layer must not block it.
- User-customizable keybindings.

**Anti-goals (a failure even if it "works")**
- **Losing user text.** Not on reload, crash, tab close, two windows open, or a big paste.
  This is the top priority.
- A slow first load or input lag. It must feel instant, including in a 10MB log.
- Clutter: toolbars full of buttons, modals for simple actions, ads, onboarding walls.
- Sending note content anywhere: no analytics on content, no network calls with user data.

## 3. Constraints

- Static SPA only. Hosted on GitHub Pages under a sub-path (`/blankleaf/`). It must work with that
  base path and offline.
- Storage is per origin (`localhost:5173` ≠ `*.github.io`). Export/import is the bridge between them.
- Browser storage can be evicted or cleared by the user. Mitigations: `navigator.storage.persist()`,
  backup reminders, and easy export.
- Browser tabs reserve some shortcuts (`⌘T`, `⌘W`, `⌘N`, `Ctrl+Tab`), so in-page defaults must not
  depend on them.
- Supported browsers: latest Chrome, Edge, Firefox and Safari (desktop). It should be usable on
  mobile, but mobile is not the design target.

## 4. Approaches considered

| | A. Vite SPA, lean libs (**chosen**) | B. Vite SPA, heavier libs | C. Next.js static export |
|---|---|---|---|
| Editor | CodeMirror 6 | Monaco | CodeMirror 6 |
| State | Zustand | Redux Toolkit | Zustand |
| UI | Tailwind + Radix primitives | MUI | shadcn/ui |
| Bundle | ~250KB gz | ~2–3MB | ~300KB |

**The user picked A.** It is small and loads fast, CodeMirror 6 handles huge documents and Markdown,
it works on mobile, and the unstyled Radix primitives let the Calm look be fully custom. B was rejected
because Monaco's size and weak mobile support work against "instant". C was rejected because routing
and server features go unused and GitHub Pages base-path handling adds friction.

## 5. Decisions made with the user

1. **Text mode is a setting.** The default is Plain text, and Markdown (with preview) can be chosen
   per note. A global default lives in Settings.
2. **Storage is IndexedDB plus backups (option A).** A linked folder on disk (option B) comes in a
   later phase.
3. **Layout C, the hybrid:**
   - A top tab bar for the notes that are open now.
   - A slim left icon rail (Notes ☰, Search 🔍, Trash 🗑) that opens a side panel (`⌘B` toggles it).
   - The editor fills the rest.
   - A slim status bar at the bottom.
   - **Zen mode** (`⌘.`) hides the tabs, rail, panel and status bar, leaving only the page. `Esc`
     or `⌘.` exits.
4. **Visual style: "Calm / modern".**
   - Neutral greys with one cool accent (dark accent around `#7c9cff`, light accent around `#4f6fff`).
   - Inter for the UI and JetBrains Mono for the editor. Both are self-hosted so they work offline.
   - Light and dark themes, following the system by default, with a toggle (◐).
   - Font, font size, accent color and monospace vs proportional text are adjustable in Settings.
5. **Hosting:** GitHub Pages served from a dedicated **`gh-pages` branch**. Build output is never
   committed to `main`. Publish with `npm run deploy` (the `gh-pages` package) or automatically by a
   GitHub Actions workflow on push to `main`. PWA built on `vite-plugin-pwa`.
6. **Stack (option A):**
   - Vite + React 19 + TypeScript (strict)
   - CodeMirror 6 via `@uiw/react-codemirror`, plus `@codemirror/lang-*` and `@codemirror/language-data`
   - Zustand for UI and session state
   - Dexie (IndexedDB) for persistence, with `dexie-react-hooks` / `liveQuery`
   - Tailwind CSS v4, Radix primitives (dialog, dropdown, context menu, tooltip, tabs, switch)
   - `cmdk` for the command palette, `@dnd-kit` for tab reordering, `lucide-react` for icons
   - A Markdown preview using `react-markdown` + `remark-gfm` (+ `rehype-sanitize`)
   - `vite-plugin-pwa`
   - Vitest + Testing Library for unit and component tests, Playwright for end-to-end tests
   - ESLint + Prettier

## 6. Product behavior

### 6.1 Notes and tabs
- A **note** is the stored document. A **tab** is an open note. A note can be closed (not shown as a
  tab) without being deleted. It still appears in the sidebar's "All notes".
- **New tab:** opens an empty Plain note and focuses the editor. It's untitled until renamed. An
  untitled note's display name is its first non-empty line (trimmed to about 40 characters), or "Untitled".
- **Closing a tab:** an empty note is deleted silently. A non-empty note just closes (it stays in All
  notes). "Reopen closed tab" restores the last closed tabs (stack of 20, kept with the session).
- **Delete:** moves the note to the **Trash**. Trash keeps notes for 30 days, then purges them on app
  start. You can restore a note or delete it permanently (with confirmation).
- **Pin:** `pinned` is a **note property** (shared across windows). Pinned notes always open as tabs,
  in every window and on restore. They sit at the left of the tab bar and show a pin indicator. They
  ignore "close others" / "close to the right". Closing a pinned tab asks you to unpin it first,
  or you unpin it from the context menu. *(Builder-check call.)*
- **Rename:** double-click the tab, or use F2, the context menu or the palette. The rename happens inline.
- **Reorder:** drag tabs (dnd-kit). The keyboard can also move a tab left or right.
- **Overflow:** with many tabs, the tab bar scrolls horizontally, and an overflow "⌄" menu lists all
  open tabs.
- **Tab context menu:** Rename, Pin/Unpin, Duplicate, Close, Close others, Close to the right, Move
  to Trash, Copy content, Export this note.

### 6.2 Editor
- CodeMirror 6, filling the area.
- Per note: mode (`plain` | `markdown`) and language (`auto` | `plaintext` | `javascript` |
  `typescript` | `json` | `python` | `sql` | `html` | `css` | `yaml` | `shell` | `log` | …).
  - `auto` detects the language from content heuristics on paste or first save.
  - `log` uses simple highlighting for levels and timestamps.
- Toggles: word wrap (per note, default on for plain/markdown, off for code/log), line numbers
  (global), and monospace vs proportional (global, default mono).
- Find and replace inside a note: CodeMirror's search panel, restyled.
- **Markdown preview:** `⌘⇧P` (or the palette) cycles Edit → Split → Preview. The preview is sanitized.
- Performance: a 10MB paste must not freeze the UI for more than about 1s. Highlighting is turned off
  automatically above a size threshold (the builder picks it, around 2MB).

### 6.3 Sidebar (from the icon rail)
- **Notes:** lists all non-trashed notes, with pinned ones first, then sorted by last edited. Shows
  the title and a relative time. Click opens or focuses a tab.
- **Search:** full-text search across all notes (title + content), case-insensitive, with highlighted
  snippets. Simple in-memory scanning is acceptable for v1. `⌘⇧F` opens it.
- **Trash:** restore, delete permanently, or empty the Trash (with confirmation).

### 6.4 Command palette (`⌘K` / `Ctrl+K`)
- Fuzzy-searches actions (new note, toggle theme, change mode or language, export, settings, zen,
  …) and notes by title (switches to or opens them).

### 6.5 Keyboard shortcuts (defaults)
`⌘` means `Ctrl` on Windows/Linux. Browser-reserved keys are avoided.

**Tab-family modifier ("Mod2"):** `⌃⌥` (Control+Option) on macOS and `Alt` on Windows/Linux.
Plain Option on a Mac types characters (`[`, `]`, `|`, `@` on many layouts), so it is never used on
its own. Matching uses `KeyboardEvent.code` (the physical key), and on Windows a key event where both
`Ctrl` and `Alt` are held (that's AltGr) is ignored, so typing on non-US layouts is never captured.
*(Builder-check call.)*

| Action | Shortcut |
|---|---|
| Command palette | `⌘K` |
| New note | `Mod2+N` |
| Close tab | `Mod2+W` |
| Reopen closed tab | `Mod2+Shift+T` |
| Next / previous tab | `Mod2+]` / `Mod2+[` (also `Ctrl+PgDn/PgUp` when the browser allows it) |
| Go to tab 1–9 | `Mod2+1…9` |
| Toggle sidebar | `⌘B` |
| Search all notes | `⌘⇧F` |
| Zen mode | `⌘.` |
| Markdown preview cycle | `Mod2+P` (not `⌘⇧P`, which Firefox uses for a private window) |
| Rename tab | `F2` |
| Settings | `⌘,` |

Inside the installed PWA window, `⌘T` / `⌘W` are also bound to new and close where the platform
delivers them.

A "Keyboard shortcuts" sheet is available from the palette and from `?` in Settings.

### 6.6 Status bar
Mode/language (click to change) · `Ln x, Col y` · word and character count · wrap state · save state
(`Saving…` / `✓ Saved` / `⚠ Not saved`, which can be clicked to see the error).

### 6.7 Settings (Radix dialog, `⌘,`)
- Appearance: theme (System/Light/Dark), accent color, UI font size, editor font and size, line
  height, monospace vs proportional.
- Editor: default mode for new notes (Plain/Markdown), default wrap, line numbers, tab size, highlight
  active line.
- Data: export all, import, storage usage and persistence status, backup reminder interval
  (default 7 days, can be turned off), clear all data (two-step confirmation).
- About: version and shortcuts.

### 6.8 Empty and first-run state
On first run there's one note, "Welcome", with a few lines on shortcuts. It can be deleted, and the app
doesn't show it again. There's no onboarding modal.

## 7. Data and persistence

### 7.1 Dexie schema (database `blankleaf`, versioned)
```ts
notes:    id (uuid), title (string|null), content (string), mode ('plain'|'markdown'),
          language (string), wrap (boolean), pinned (boolean),
          createdAt, updatedAt (epoch ms), deletedAt (epoch ms|null), rev (int)
          indexes: id, updatedAt, deletedAt, pinned
tombstones: id, purgedAt   (permanently deleted notes; used by import)
session:  key 'current' → { openTabIds: string[], activeTabId, closedStack: string[],
          perTab: { [id]: { cursor, selection, scrollTop, previewMode } },
          sidebar: { open: boolean, panel: 'notes'|'search'|'trash' }, zen: boolean }
settings: key 'current' → Settings object (with defaults merged on load)
meta:     schemaVersion, lastBackupAt, welcomeShown
```
Migrations go through Dexie `version().upgrade()`. Never drop user data in a migration.

### 7.2 Save semantics
- Content edits update Zustand immediately and write to Dexie **debounced (~300ms)**. Pending writes
  are **flushed immediately** on `visibilitychange → hidden`, `pagehide`, tab switch and note close.
- Cursor and scroll state is saved debounced (~1s) and flushed on the same events.
- A write failure (quota or other) sets the status bar to `⚠ Not saved` with a toast offering "Export
  now". The in-memory text is kept and saving is retried.
- On start, call `navigator.storage.persist()` and show the result in Settings → Data.

### 7.3 Multiple windows or tabs of Blankleaf
- `BroadcastChannel('blankleaf')` announces note changes, and other windows apply them live when
  they have no unsaved local edits to that note.
- **No version is ever silently lost** *(builder-check call)*: each note carries a `rev` counter.
  A save is a compare-and-set in a Dexie transaction (`rev` must match what this window last loaded).
  If it doesn't match, another window wrote first. The local text is then saved as a **new note**
  "<title> (conflict copy)", opened in a tab next to the original, and a toast explains what happened.
  The original keeps the other window's text.
- The session (open tabs) is **per window**, held in memory. A window persists its session when it
  gains focus and on every session change while focused. A new window, or the next start, restores the
  last persisted session, so two windows may show the same tabs and that's fine. Pinned notes are
  always added. *(Builder-check call.)*

### 7.4 Export and import
- **Export all:** one `blankleaf-backup-YYYY-MM-DD.json` file `{ app: 'blankleaf', schemaVersion,
  exportedAt, notes, settings }`. Trash is included and flagged.
- **Export one note:** a `.txt` or `.md` file (by mode), or one with the language's extension.
- **Import:** a `.json` backup (merge by id, keeping the newer `updatedAt`, with a summary dialog
  before applying). Moving to Trash and restoring both bump `updatedAt`. Permanently deleted notes
  leave a tombstone (`id`, `purgedAt`) in a `tombstones` table, and import skips them by default. The
  summary dialog offers "Also restore N notes you deleted". *(Builder-check call.)* or plain `.txt` / `.md` / code files, each of which becomes a new note.
  Dragging files onto the window imports them too.
- **Backup reminder:** if `lastBackupAt` is older than the interval and there are non-empty notes,
  a dismissible toast offers "Export backup".

## 8. Architecture sketch

```
src/
  app/           App shell, layout (TabBar, Rail, SidePanel, EditorArea, StatusBar), providers
  features/
    tabs/        tab bar, dnd, context menu, overflow
    editor/      CodeMirror setup, extensions, theme, language detection, markdown preview
    sidebar/     notes list, search, trash
    palette/     cmdk command palette + command registry
    settings/    settings dialog
    backup/      export/import, reminder
  store/         zustand slices (notes, session, settings, ui) + persistence bridge
  db/            dexie schema, repositories, migrations
  sync/          BroadcastChannel cross-window sync
  lib/           shortcuts, ids, time, debounce/flush
  styles/        tailwind entry, Calm theme tokens (CSS variables, light/dark)
```
- A single command registry powers the palette, the shortcuts and the menus, so each action is
  defined once.
- Theme tokens are CSS variables on `:root` / `[data-theme=dark]`, and Tailwind maps to those tokens.
  The CodeMirror theme reads the same variables.

## 9. Delivery: step by step

The user wants to go step by step, with a review after each step. Each step ends in a working app and
several meaningful commits.

0. **Scaffold:** Vite + React + TS, Tailwind, ESLint/Prettier, Vitest, `.gitignore`
   (including `.superpowers/`), README, a CI workflow (lint + test + build).
1. **Shell + theme:** full-viewport layout C with placeholder panels, Calm light and dark tokens,
   self-hosted fonts, theme toggle.
2. **Editor:** a single CodeMirror editor with the Calm theme, status bar (Ln/Col, counts).
3. **Tabs + store:** Zustand notes/session, create, close, switch, rename, pin, reorder (dnd), auto-title,
   reopen closed tab.
4. **Persistence:** Dexie schema, autosave with flush, session restore (including cursor and scroll),
   save indicator, `storage.persist()`.
5. **Sidebar:** notes list, cross-note search, Trash with 30-day purge.
6. **Command palette + shortcuts + zen mode.**
7. **Modes and languages:** per-note language and auto-detect, log highlighting, wrap toggle, Markdown
   Edit/Split/Preview, a large-document guard.
8. **Settings dialog.**
9. **Backup:** export and import (JSON and files, drag and drop), backup reminder.
10. **Cross-window sync** (BroadcastChannel).
11. **PWA + GitHub Pages deploy** (base path, manifest, icons, offline, Actions workflow).
12. **Polish:** accessibility pass (focus, ARIA on tabs and menus, contrast), Playwright end-to-end tests of the
    critical flows (type → reload → text restored, tabs restored, trash restore, export/import
    round-trip), performance check with a 10MB log.

**Later phase (not v1):** linking a folder on disk via the File System Access API (Chromium), saving
each note as a real file.

**Commits:** Conventional Commits (`feat(tabs): add drag-to-reorder`, `fix(db): flush pending
save on pagehide`, `chore: …`, `test: …`, `docs: …`). One logical change per commit, never "wip"
or a mixed bag.

## 10. Testing priorities
- Unit: auto-title, language detection, debounce/flush, the import merge rule, trash purge, settings
  defaults merge.
- Component: tab actions, status bar, palette commands.
- E2E (Playwright): **no-data-loss** scenarios first: type then reload immediately; close the browser
  tab mid-debounce; two windows editing; quota error path (simulated).

## 10a. Planned after v1: share a note by link (user request, 2026-11-16)
The user wants to share a note easily via a link. Direction so far: no server. The note (content,
title, format) is compressed into the link's `#fragment`, so it never reaches any server. Opening the
link in Blankleaf creates a **copy** as a new note for the recipient, with an option to download it as a
file instead. This needs its own short spec before building (link length limits, very large notes,
wording that makes clear that anyone with the link can read the note).

## 11. Left to the builder
- Exact debounce values, the highlighting size threshold, and the language-detect heuristics.
- The precise color values within the Calm direction, spacing scale and animation details (subtle and
  fast, respecting `prefers-reduced-motion`).
- Choice of the uuid helper, toast implementation and the exact icon set mapping.
- Internal file structure details beyond §8.
- Whether search uses simple scanning or a small index, as long as it's fast with about 1,000 notes.
