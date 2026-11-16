# Notepadz

A full-window, tabbed notepad that lives in your browser.

- **Uses the whole window.** Tabs on top, an optional sidebar, and a zen mode that hides everything but the page.
- **Remembers your session.** Open tabs, cursor and scroll position come back after a reload or restart.
- **Private by design.** There is no server and no account. Notes are stored only in your browser (IndexedDB) and never leave your machine. Use Export to back them up.

## Sharing a note

Click **Share** in the status bar (or **Share…** in a tab's menu, or _Share note…_ in the ⌘K palette):

1. Pick how long the link works — **5 min** (default), 1 hour, 1 day or 7 days.
2. Keep **Protect with password** on (a random `xxxx-xxxx-xxxx` password is generated; ↻ for a new one) or switch it off.
3. **Create link** — a ready-to-send message with the link, password and expiry is copied.

The recipient opens the link, types the password and gets a read-only copy they can **Save to my notes** or **Download**.

How it works, and what to know:

- **No server stores your note.** It's encrypted in your browser and sent directly to the recipient's browser (WebRTC). A free public PeerJS server only introduces the two browsers; it never sees the note, key or password.
- **Keep Notepadz open** until the link has been opened. If you close it, the link waits; reopen Notepadz before the expiry and the same link works again.
- **Expiry is real**: when it passes (or you click _Stop sharing_), your browser stops answering and forgets the key — the link can never deliver the note again. Anyone who opened it before then can keep their copy.
- **The password is checked by your browser** before anything is sent; after 5 wrong tries it pauses attempts (30 s, doubling). For confidential notes, send the password a different way than the link.
- The status bar shows **Sharing N notes · m:ss left**; click it to see every active share, copy its message again, or stop it.
- If a direct browser-to-browser connection isn't possible, PeerJS's free relay may forward the data — still encrypted end to end, so the relay can't read it. If even that fails, the recipient is told to try another network.

## Development

Requires Node 24.

```bash
npm install
npm run dev        # start dev server
npm test           # unit tests (Vitest)
npm run lint       # ESLint
npm run typecheck  # TypeScript
npm run build      # production build (served from /notepadz/)
```

## Deploy (GitHub Pages)

The built app is published to a separate **`gh-pages`** branch — build output is never committed to `main`.

One-time setup on GitHub: **Settings → Pages → Source: Deploy from a branch → Branch: `gh-pages` / `(root)`**.
The site is then served at `https://<user>.github.io/notepadz/`.

- **Automatic:** every push to `main` runs `.github/workflows/deploy.yml` (lint, typecheck, tests, build) and publishes `dist/` to `gh-pages`.
- **Manual:** `npm run deploy` builds and pushes `dist/` to `gh-pages` from your machine (uses the [`gh-pages`](https://www.npmjs.com/package/gh-pages) package).

Notepadz is a PWA: after the first visit it works offline and can be installed from the browser's address bar. When a new version is deployed, the app offers a **Reload** — it never reloads on its own.

Icons are generated from `public/logo.svg` with `npm run icons`.

## Docs

- Design: [`docs/superpowers/specs/2026-11-16-notepadz-design.md`](docs/superpowers/specs/2026-11-16-notepadz-design.md)
- Implementation plan: [`docs/superpowers/plans/2026-11-16-notepadz-v1.md`](docs/superpowers/plans/2026-11-16-notepadz-v1.md)

Commits follow [Conventional Commits](https://www.conventionalcommits.org/).
