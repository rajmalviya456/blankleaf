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

## Docs

- Design: [`docs/superpowers/specs/2026-11-16-notepadz-design.md`](docs/superpowers/specs/2026-11-16-notepadz-design.md)
- Implementation plan: [`docs/superpowers/plans/2026-11-16-notepadz-v1.md`](docs/superpowers/plans/2026-11-16-notepadz-v1.md)

Commits follow [Conventional Commits](https://www.conventionalcommits.org/).
