# Security policy

Blankleaf has no server: notes stay in the browser, locked notes are encrypted with AES-256-GCM
from a password, and share links are end-to-end encrypted. A flaw in any of that matters, so
thank you for looking.

## Supported versions

Only the latest release, which is what [the live site](https://rajmalviya456.github.io/blankleaf/)
runs, gets security fixes. Installed copies update themselves on the next visit.

## Reporting a vulnerability

Please **don't open a public issue**. Report it privately instead:

1. Go to [Security → Report a vulnerability](https://github.com/rajmalviya456/blankleaf/security/advisories/new).
2. Describe the problem, the steps to reproduce it, and what an attacker could do with it.
   Use made-up note content, never real private notes.

I aim to reply within a week. Once a fix is released, the advisory is published and you are
credited, unless you'd rather not be.

## In scope

- Reading a locked note, a share link or a backup without its password or key
- Note content or keys leaving the browser, other than an encrypted share the user created
- Script running from note content (Markdown, Mermaid, math, HTML export, share pages)
- Weaknesses in how the app is served (service worker, headers, dependencies)

## Out of scope

- Someone with access to an unlocked browser profile reading unlocked notes: they are stored
  in that browser by design
- Forgotten passwords: there is no recovery, by design
