## What and why

<!-- What this changes for people using Blankleaf, and why. Link the issue: "Closes #123". -->

## How it was tested

<!-- The tests you added (written first, seen failing), plus anything you checked by hand. Add a screenshot for anything visible. -->

## Checklist

- [ ] `npm run lint && npm run format:check && npm run typecheck && npm test && npm run e2e && npm run build` passes
- [ ] Notes stay in the browser: nothing new sends note content anywhere
- [ ] Existing notes and backups still open (a Dexie migration if storage changed)
- [ ] New actions are in the command registry, with labels and keyboard access
- [ ] The PR title follows [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:` …)
