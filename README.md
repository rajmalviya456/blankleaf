# Blankleaf — Online Notepad

A free online notepad that opens straight to a blank page: full-window, tabbed, and saved in your
browser as you type. No account, no server, no database — your notes stay on your machine.

_Formerly Notepadz._

**▶ Open it: [rajmalviya456.github.io/blankleaf](https://rajmalviya456.github.io/blankleaf/)** — works offline and
installs as an app after the first visit.

[![CI](https://github.com/rajmalviya456/blankleaf/actions/workflows/ci.yml/badge.svg)](https://github.com/rajmalviya456/blankleaf/actions/workflows/ci.yml)
[![Deploy](https://github.com/rajmalviya456/blankleaf/actions/workflows/deploy.yml/badge.svg)](https://github.com/rajmalviya456/blankleaf/actions/workflows/deploy.yml)

## Why

Most online notepads are a single text box, lose your work when the tab closes, or want you to
sign up. Blankleaf is for quick scratch text, code snippets and logs, and long-lived notes — in
one calm, keyboard-friendly window that remembers exactly where you left off.

## Features

- **Uses the whole window.** Tabs on top, an optional sidebar (notes, search, trash) and a zen
  mode that hides everything but the page.
- **Remembers your session.** Open tabs, cursor and scroll position come back after a reload or
  restart. Several windows stay in sync.
- **Plain text or Markdown, per note.** Markdown notes have edit / split / preview, with
  highlighted code fences.
- **Syntax highlighting for 20+ formats** — JSON, YAML, TOML, XML, logs, diffs, Dockerfile,
  JavaScript/TypeScript, Python, SQL, HTML, CSS, shell, Java, C/C++, Go, Rust, PHP — picked
  automatically from what you type, or chosen from the format menu.
- **Version history.** Earlier versions of each note are saved as you write; read one and restore
  it in a click, on this device only.
- **Text and dev tools.** Format or minify JSON, convert JSON ⇄ YAML, and encode or decode Base64
  and URLs, on the selection or the whole note.
- **Clickable checklists.** Tick `- [ ]` items right in the Markdown preview.
- **Print or save as PDF.** A clean copy of any note, with Markdown formatted.
- **Export to HTML or Word.** Download any note as a web page or a real `.docx`, with Markdown
  formatting kept.
- **Note templates.** Start a daily journal, meeting notes, checklist or to-do list in one click.
- **Spell check per note**, using your browser's own checker.
- **Diagrams and math in Markdown.** Draw Mermaid diagrams in a ` ```mermaid ` block and write math as
  `$$x^2$$`.
- **Two notes side by side** on wide screens.
- **Password-locked notes.** Encrypt a note in your browser with AES-256. A forgotten password can't be
  recovered.
- **Tags.** Label notes, filter the list by tag, and find tags in search.
- **Sort your notes** by last edited, date created or name.
- **Toolbar that fits the note.** Markdown notes get headings, bold, italic, lists, quotes,
  links and code blocks. Plain text, code and logs get change case, sort / dedupe / trim lines
  and insert date — no stray `**` in your code. Every button is one undo step. Turn it off in
  Settings if you prefer a bare page.
- **Find & replace, search across all notes, pinned tabs, trash with restore** (kept 30 days).
- **Share a note by link** — end-to-end encrypted, password-protected, expiring
  ([details below](#sharing-a-note)).
- **Backups you control.** Export everything to one JSON file, import it back, or drop text
  files onto the window to open them. A gentle reminder nudges you to back up.
- **Command palette (⌘K / Ctrl+K)** for every action, and a shortcuts sheet (⌘/ / Ctrl+/).
- **Light and dark themes**, accent colour, editor font and size, line numbers, tab size.
- **Works on phones.** Below 640px wide the note fills the screen under a slim top bar: tap
  the title to switch tabs, ☰ for notes / search / trash, ⋯ for everything else. The toolbar
  sits above the on-screen keyboard and every dialog opens as a bottom sheet (drag down or press
  Back to close). Phones keep their own text size.
- **Installable PWA** that works offline. New versions offer a _Reload_ — never a surprise
  refresh.

## Privacy

There is no backend. Notes are stored in your browser's IndexedDB and never leave your machine
unless you export them or share one. Clearing site data for the page deletes them, so export a
backup now and then.

## Keyboard shortcuts

On macOS **⌃⌥** is Control+Option; on Windows/Linux it is **Alt**.

| Action                          | macOS     | Windows / Linux |
| ------------------------------- | --------- | --------------- |
| Command palette                 | ⌘K        | Ctrl+K          |
| New note                        | ⌃⌥N       | Alt+N           |
| Close tab                       | ⌃⌥W       | Alt+W           |
| Reopen closed tab               | ⌃⌥⇧T      | Alt+Shift+T     |
| Next / previous tab             | ⌃⌥] / ⌃⌥[ | Alt+] / Alt+[   |
| Go to tab 1–9                   | ⌃⌥1 … ⌃⌥9 | Alt+1 … Alt+9   |
| Rename note                     | F2        | F2              |
| Markdown edit / split / preview | ⌃⌥P       | Alt+P           |
| Toggle sidebar                  | ⌘B        | Ctrl+B          |
| Search all notes                | ⌘⇧F       | Ctrl+Shift+F    |
| Find & replace in note          | ⌘F        | Ctrl+F          |
| Zen mode                        | ⌘.        | Ctrl+.          |
| Keyboard shortcuts              | ⌘/        | Ctrl+/          |

When installed as an app, ⌘T / ⌘W (Ctrl+T / Ctrl+W) also open and close tabs.

## Sharing a note

Click **Share** in the status bar or toolbar (or **Share…** in a tab's menu, or _Share note…_
in the palette):

1. Pick how long the link works — **5 min** (default), 1 hour, 1 day or 7 days.
2. Keep **Protect with password** on (a random `xxxx-xxxx-xxxx` password is generated; ↻ for a
   new one) or switch it off.
3. **Create link** — a ready-to-send message with the link, password and expiry is copied.

The recipient opens the link, types the password and gets a read-only copy they can **Save to
my notes** or **Download**.

How it works, and what to know:

- **No server stores your note.** It's encrypted in your browser (AES-256-GCM, key in the
  link's `#fragment`, password stretched with PBKDF2) and sent directly to the recipient's
  browser over WebRTC. A free public PeerJS server only introduces the two browsers; it never
  sees the note, key or password.
- **Keep Blankleaf open** until the link has been opened. If you close it, the link waits;
  reopen Blankleaf before the expiry and the same link works again.
- **Expiry is real**: when it passes (or you click _Stop sharing_), your browser stops answering
  and forgets the key — the link can never deliver the note again. Anyone who opened it before
  then can keep their copy.
- **The password is checked by your browser** before anything is sent; after 5 wrong tries it
  pauses attempts (30 s, doubling). For confidential notes, send the password a different way
  than the link.
- The status bar shows **Sharing N notes · m:ss left**; click it to see every active share, copy
  its message again, or stop it.
- If a direct browser-to-browser connection isn't possible, PeerJS's free relay may forward the
  data — still encrypted end to end, so the relay can't read it. If even that fails, the
  recipient is told to try another network.

## Tech stack

[Vite](https://vite.dev) · [React 19](https://react.dev) · TypeScript ·
[Zustand](https://zustand.docs.pmnd.rs) (state) · [Dexie](https://dexie.org) (IndexedDB) ·
[CodeMirror 6](https://codemirror.net) (editor) · [Tailwind CSS v4](https://tailwindcss.com) ·
[Radix UI](https://www.radix-ui.com) · [cmdk](https://cmdk.paco.me) ·
[dnd-kit](https://dndkit.com) · [PeerJS](https://peerjs.com) (sharing) ·
[vite-plugin-pwa](https://vite-pwa-org.netlify.app). Tests: Vitest, Testing Library,
Playwright + axe.

## Project layout

```
src/
  app/          App shell and layout (tab bar, rail, sidebar, editor area, status bar)
  commands/     Command registry — every action, its shortcuts and palette entry
  db/           Dexie schema and persistence
  domain/       Types, defaults, pure note logic (titles, formats, detection)
  features/     editor, toolbar, tabs, sidebar, palette, settings, backup, sync, share, help
  store/        Zustand store and selectors
  lib/  ui/     Small shared helpers and UI primitives (toasts, dialogs)
e2e/            Playwright end-to-end and accessibility tests
docs/           Design specs and implementation plans
```

## Development

Requires **Node 24**.

```bash
npm install
npm run dev          # dev server at http://localhost:5173/
npm test             # unit tests (Vitest)
npm run e2e          # end-to-end + accessibility tests (Playwright)
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm run format       # Prettier
npm run build        # production build (served from /blankleaf/)
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to propose changes.

## Versions and releases

Blankleaf follows [Semantic Versioning](https://semver.org). Versions are worked out from the
[Conventional Commits](https://www.conventionalcommits.org/) on `main` by
[release-please](https://github.com/googleapis/release-please):

| Commits since the last release              | Next version  |
| ------------------------------------------- | ------------- |
| only `fix:` / `perf:`                       | 1.0.0 → 1.0.1 |
| at least one `feat:`                        | 1.0.0 → 1.1.0 |
| a `!` (e.g. `feat!:`) or `BREAKING CHANGE:` | 1.0.0 → 2.0.0 |

1. Every push to `main` runs CI, and release-please opens (or updates) a pull request named
   **`chore(main): release x.y.z`** that bumps `package.json` and adds the new section to
   [`CHANGELOG.md`](CHANGELOG.md).
2. **Merging that pull request is the release**: it tags `vx.y.z`, publishes a GitHub Release
   with the notes, and deploys the site.

The app reads `CHANGELOG.md` at build time: **What's new** (in About or the command palette)
shows the release notes offline, and after an update the app says _"Blankleaf was updated to
x.y.z"_ once.

## Deploy (GitHub Pages)

The built app is published to a separate **`gh-pages`** branch — build output is never committed
to `main`.

One-time setup on GitHub: **Settings → Pages → Source: Deploy from a branch → Branch:
`gh-pages` / `(root)`**.

- **Automatic:** merging a release pull request runs `.github/workflows/deploy.yml` (lint,
  typecheck, tests, build) and publishes `dist/` to `gh-pages`.
- **By hand:** _Actions → Deploy → Run workflow_ redeploys `main` without a new version.
- **Manual:** `npm run deploy` builds and pushes `dist/` to `gh-pages` from your machine.

Icons are generated from `public/logo.svg` with `npm run icons`.

## Docs

- App design: [`docs/superpowers/specs/2026-11-16-blankleaf-design.md`](docs/superpowers/specs/2026-11-16-blankleaf-design.md)
- Sharing design: [`docs/superpowers/specs/2026-11-17-share-by-link-design.md`](docs/superpowers/specs/2026-11-17-share-by-link-design.md)
- Toolbar design: [`docs/superpowers/specs/2026-11-17-toolbar-design.md`](docs/superpowers/specs/2026-11-17-toolbar-design.md)
- Implementation plans: [`docs/superpowers/plans/`](docs/superpowers/plans/)
