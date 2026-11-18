#!/bin/sh
# Runs the browser tests in Linux, like CI does. Fonts and text widths differ between macOS and
# Linux, so a layout can pass on a Mac and still fail in CI. Needs Docker.
set -e
version=$(node -p "require('./node_modules/@playwright/test/package.json').version")
# node_modules and dist stay inside the container: they are built for Linux there.
exec docker run --rm \
  -v "$PWD":/work -v /work/node_modules -v /work/dist -w /work \
  -e CI=1 \
  "mcr.microsoft.com/playwright:v$version-noble" \
  sh -c 'npm ci --no-audit --no-fund && npx playwright test "$@"' -- "$@"
