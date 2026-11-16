# Notepadz

A full-window, tabbed notepad that lives in your browser.

- **Uses the whole window.** Tabs on top, an optional sidebar, and a zen mode that hides everything but the page.
- **Remembers your session.** Open tabs, cursor and scroll position come back after a reload or restart.
- **Private by design.** There is no server and no account. Notes are stored only in your browser (IndexedDB) and never leave your machine. Use Export to back them up.

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
