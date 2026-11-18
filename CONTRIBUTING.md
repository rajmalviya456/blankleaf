# Contributing to Blankleaf

Thanks for wanting to help! Bug reports, ideas and pull requests are all welcome.

## Ground rules

Blankleaf has a few promises that every change must keep:

- **No backend, no account.** Notes live only in the user's browser (IndexedDB). Don't add
  analytics, tracking, or anything that sends note content to a server. (Link sharing sends
  end-to-end encrypted data browser-to-browser; see the sharing spec.)
- **Never lose text.** Changes to storage, sync or import must keep existing notes readable.
  Bump the Dexie schema version and add a migration rather than changing a table in place.
- **Calm and keyboard-friendly.** Every action belongs in the command registry
  (`src/commands/registry.ts`) so it shows in the palette and the shortcuts sheet.
- **Accessible.** Interactive elements need a label, keyboard access and visible focus. The
  Playwright suite runs axe in light and dark themes; keep it passing.

## Reporting a bug

Open an issue with:

1. What you did, step by step.
2. What you expected, and what happened instead.
3. Browser and OS (e.g. Chrome 140 on macOS 15), and whether Blankleaf was installed as an app.

Please don't paste private note content — a small made-up example is enough.

## Suggesting a feature

Open an issue describing the problem you're trying to solve before writing code. Bigger
features get a short design doc in `docs/superpowers/specs/` first (see the existing ones for
the shape: why, goals, non-goals, approaches, decisions).

## Setting up

Requires **Node 24**.

```bash
git clone https://github.com/rajmalviya456/blankleaf.git
cd blankleaf
npm install
npx playwright install chromium   # once, for end-to-end tests
npm run dev                        # http://localhost:5173/
```

## Making a change

1. Fork and branch from `main`: `git switch -c fix/short-description`.
2. **Write the test first.** Unit tests sit next to the code (`*.test.ts(x)`, Vitest + Testing
   Library); browser flows go in `e2e/` (Playwright). Watch the test fail, then make it pass.
3. Keep the change focused — one fix or feature per pull request.
4. Run the full check before pushing — it is what CI runs:

   ```bash
   npm run lint && npm run format:check && npm run typecheck && npm test && npm run e2e && npm run build
   ```

   `npm run format` fixes formatting.

5. Open a pull request describing **what** changed and **why**, with a screenshot for anything
   visible. Link the issue it closes.

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/). Write the subject as what
the change does for the user, and the body as why:

```
fix(tabs): hide the open-tabs menu when there is nothing to choose

With one tab (or none) the ⌄ menu listed nothing useful, so it is now only shown
when two or more tabs are open.
```

Common types: `feat`, `fix`, `perf`, `refactor`, `test`, `docs`, `build`, `ci`, `chore`.
Scopes follow the folders in `src/features/` (`editor`, `toolbar`, `tabs`, `share`, …).

## Code style

- TypeScript strict; no `any` without a comment saying why.
- React function components and hooks. App state goes through the Zustand store
  (`src/store/store.ts`); pure logic goes in `src/domain/` with its own tests.
- Tailwind utility classes using the theme tokens (`bg-bg`, `text-fg-muted`, `border-border`,
  `bg-accent-soft` …) — no hard-coded colours, so light and dark both work.
- Prettier and ESLint settle formatting; don't fight them.
- Comments explain _why_, not _what_.

## Releasing

Releases follow [Semantic Versioning](https://semver.org), worked out from commit types — so
the type you pick matters: `fix:` → patch, `feat:` → minor, `feat!:` or a `BREAKING CHANGE:`
footer → major. `docs`, `test`, `chore`, `ci`, `refactor` and `style` don't trigger a release
and stay out of the changelog.

Don't edit `CHANGELOG.md` or the `version` in `package.json` by hand. release-please keeps a
**`chore(main): release x.y.z`** pull request up to date; a maintainer merges it to publish the
release (tag, GitHub Release, deploy to GitHub Pages). Build output is never committed to
`main`.
