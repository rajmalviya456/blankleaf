# Share by Link (Live Handoff) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user share a frozen snapshot of a note through a password-protected link that really expires (default 5 minutes), delivered peer-to-peer from their open Notepadz with no server of their own.

**Architecture:** The sender's browser encrypts the snapshot (WebCrypto, AES-256-GCM) once, stores it in a new Dexie `shares` table, and serves it over WebRTC (PeerJS) under a peer id derived from the link key. A recipient who opens `#/s/<key>.<exp>.<p|n>` gets a lightweight share view. It derives a read token (with the password if set), proves it to the sender, receives the ciphertext and decrypts locally. Expiry, stop, the password check and the cool-down are all enforced by the sender. Transport sits behind an interface: PeerJS in production, in-memory and BroadcastChannel versions for tests.

**Tech Stack:** Existing stack (React 19, TS, Zustand, Dexie, CodeMirror, Radix, Vitest, Playwright) + `peerjs`. WebCrypto + `CompressionStream` (no crypto libraries).

**Spec:** `docs/superpowers/specs/2026-11-17-share-by-link-design.md` (read it first; § references point there). It builds on `docs/superpowers/specs/2026-11-16-notepadz-design.md`.

## Global Constraints

- **No server of our own.** Only PeerJS's free public signaling and its default public STUN servers.
- **Never on the signaling channel or any server:** note content, `K`, the password, `readToken`.
- **Expiry choices:** `5 min` (default) / `1 hour` / `1 day` / `7 days`.
- **Size cap:** `5 MB` compressed snapshot.
- **Passwords:**
  - Generated: 12 chars from `abcdefghjkmnpqrstuvwxyz23456789` (no 0/o/1/l/i), shown `xxxx-xxxx-xxxx`.
  - Normalisation: strip spaces and `-`, otherwise case-sensitive.
  - Minimum 8 characters after normalisation.
  - On by default.
- **Key derivation:** `K` = 32 random bytes. PBKDF2-SHA256 600000 iterations, with the 16-byte salt derived from `K`. HKDF-SHA256 derivations bind `exp` and the password flag.
- **Encryption:** AES-256-GCM with a 96-bit random IV, AAD = `notepadz-share-v1|<exp>|<p|n>`.
- **Link format:** `<origin><base>#/s/<base64url(K)>.<exp base36 seconds>.<p|n>`.
- **Cool-down:** after 5 wrong passwords, refuse all attempts for 30 s, doubling each time (sender-enforced).
- **Copied message:** the exact format in spec §5.1, locale date and time; the title is never included.
- **Live countdowns everywhere.** The sender dialog, the status-bar indicator, its popover rows and the recipient's banner all tick **every second**:
  - `m:ss` under 1 hour,
  - `h:mm:ss` up to 1 day,
  - `Nd h:mm` beyond that.

  They all use one shared `useCountdown(expiresAt)` hook.
- **The sender can see and revoke every active share** from the status-bar indicator's popover, in any window, whichever note or window created it.
- **Frozen snapshot**, taken at Create.
- **Opening a share link never touches the recipient's notes** until Save.
- **Commits:** Conventional Commits, one logical change each. Commit on `main` as the project does now. Do not push without the user's OK.

## Review Focus

1. **Recipient opens the link after expiry while the sender is offline.** Expected: "expired" immediately (from the link), not an endless "waiting". Test: Task 6 `expired link never connects`.
2. **Someone with the link but no password.** Expected: never receives ciphertext, and repeated guesses hit the cool-down. Tests: Task 5 `wrong token gets denied and no ciphertext`, `5 failures start a 30s cool-down that doubles`.
3. **The sender reloads or closes and reopens Notepadz mid-share.** Expected: the same link keeps working until expiry; expired rows are wiped on start. Test: Task 5 `resumes serving after restart; expired rows deleted`.
4. **Two sender windows open.** Expected: exactly one serves; Stop in either window ends the share. Tests: Task 5 `only one host serves a share (lock)`, Task 8 `stop from another window ends serving`.
5. **A recipient's first visit.** Expected: no Welcome note, no DB writes until Save. Test: Task 9 `opening a share link creates no notes`.

---

## File Structure

```
src/features/share/
  password.ts        generatePassword, normalizePassword, MIN_PASSWORD_LEN
  link.ts            buildShareLink, parseShareHash, SHARE_HASH_PREFIX
  message.ts         formatShareMessage
  countdown.ts       formatCountdown, useCountdown (ticks every 1s)
  crypto.ts          deriveSecrets, packSnapshot, unpackSnapshot, encryptSnapshot, decryptSnapshot, sha256Hex, timingSafeEqual
  protocol.ts        Hello / Reply message types + guards
  transport.ts       ShareTransport interface
  memoryTransport.ts in-memory transport (unit/integration tests)
  channelTransport.ts BroadcastChannel transport (e2e: two tabs, same origin)
  peerTransport.ts   PeerJS transport (production)
  pickTransport.ts   chooses transport (test flag → channel, else PeerJS)
  sharesRepo.ts      Dexie CRUD for shares
  host.ts            ShareHost: create/serve/stop/resume, handshake rules, cool-down, Web Lock
  receiver.ts        openShare state machine (recipient)
  ShareDialog.tsx    popup (expiry, password, create, copy, countdown, stop)
  SharesIndicator.tsx status-bar indicator + popover
  ShareView.tsx      recipient page (lightweight entry)
  shareStore.ts      zustand slice for host UI state (active shares list, dialog target)
src/db/db.ts         schema v2: shares table
src/main.tsx         route #/s/… to ShareView before booting the app
```

---

### Task 1: Passwords, links and the share message (pure)

**Files:**
- Create: `src/features/share/password.ts`, `link.ts`, `message.ts`
- Test: `password.test.ts`, `link.test.ts`, `message.test.ts` (next to their sources)

**Interfaces:**
- Produces:
```ts
export const PASSWORD_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
export const MIN_PASSWORD_LEN = 8
generatePassword(random?: (n: number) => Uint8Array): string          // 'xxxx-xxxx-xxxx'
normalizePassword(input: string): string                             // strip spaces and '-'
isPasswordValid(input: string): boolean                              // normalised length ≥ 8
export const SHARE_HASH_PREFIX = '#/s/'
interface ShareLinkParts { key: Uint8Array; exp: number /* epoch seconds */; hasPassword: boolean }
buildShareLink(appUrl: string, parts: ShareLinkParts): string        // appUrl = origin + base path
parseShareHash(hash: string): ShareLinkParts | null                  // null on any malformation
formatShareMessage(o: { link: string; password: string | null; expiresAt: number; now: number;
  locale?: string; timeZone?: string }): string
```
- `generatePassword` uses rejection sampling (no modulo bias). `random` defaults to `crypto.getRandomValues`.

- Also produces:
  - `formatCountdown(msLeft: number): string`, giving `'4:07'`, `'59:59'`, `'1:00:00'`, `'2d 3:04'`, or `'0:00'` when ≤ 0.
  - `useCountdown(expiresAt: number, now?: () => number): { msLeft: number; label: string; expired: boolean }`. It re-renders every 1 s via one `setInterval` and stops at 0.
  - Add `countdown.ts` and `countdown.test.ts` to this task.

- [ ] **Step 1: Failing tests.**
  - `formatCountdown boundaries`: 0, 59 s, 4:07, 59:59, 1:00:00, 1 day+.
  - `useCountdown ticks every second and reports expired at 0` (fake timers, `renderHook`).
  - `generates 12 chars from the alphabet grouped 4-4-4`: `/^[a-hj-km-np-z2-9]{4}-…{4}-…{4}$/` over 200 runs, and no `0 o 1 l i`.
  - `normalizes spaces and hyphens, keeps case`: `normalizePassword(' Kq7m-x3vr p9tz ')` → `'Kq7mx3vrp9tz'`.
  - `rejects passwords shorter than 8 after normalising`: `isPasswordValid('ab-cd-ef')` → false.
  - `round-trips link parts`: random 32-byte key, `exp: 1794900000`, `hasPassword: true`. The link starts with `'https://x.dev/notepadz/#/s/'` and `parseShareHash(new URL(link).hash)` deep-equals the parts.
  - `rejects malformed hashes`: wrong prefix, a key that isn't 32 bytes, bad base36, a flag not in `p|n`, extra segments → `null`.
  - `formats the message with password`, at `locale 'en-US'`, `timeZone 'UTC'`, `expiresAt = now + 300000`:
```
Hey! A note was shared with you on Notepadz.

Open it: <link>
Password: kq7m-x3vr-p9tz

This link expires on Nov 17, 2026 at 2:37 PM (in 5 minutes).
```
  - `omits the password line when there is none`.
  - `relative wording`: `in 1 hour`, `in 1 day`, `in 7 days`.
- [ ] **Step 2:** Run `npx vitest run src/features/share`. Expected: FAIL.
- [ ] **Step 3:** Implement.
  - Base64url via `btoa` on bytes, with no padding.
  - Date and time via `Intl.DateTimeFormat(locale, {dateStyle:'medium'})` and `{timeStyle:'short'}`.
  - Relative wording via `Intl.RelativeTimeFormat` or simple rules (whole minutes, hours or days).
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5: Commit:** `feat(share): add password generator, share links and share message`

### Task 2: Crypto (derivations, snapshot packing, AES-GCM)

**Files:**
- Create: `src/features/share/crypto.ts`
- Test: `src/features/share/crypto.test.ts`

**Interfaces:**
- Consumes: `normalizePassword` (Task 1).
- Produces:
```ts
interface Snapshot { v: 1; title: string; language: LanguageId; mode: NoteMode; content: string }
interface Secrets { peerId: string; readToken: Uint8Array; encKey: CryptoKey; aad: Uint8Array }
deriveSecrets(key: Uint8Array, exp: number, password: string | null): Promise<Secrets>
packSnapshot(note: Note): Promise<Uint8Array>           // JSON → deflate-raw
unpackSnapshot(bytes: Uint8Array): Promise<Snapshot>    // validates shape; throws on bad data
encryptSnapshot(s: Secrets, packed: Uint8Array): Promise<{ iv: Uint8Array; ciphertext: Uint8Array }>
decryptSnapshot(s: Secrets, iv: Uint8Array, ciphertext: Uint8Array): Promise<Uint8Array>
sha256Hex(bytes: Uint8Array): Promise<string>
timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean
export const PBKDF2_ITERATIONS = 600_000
```
- `peerId` = `'npz-' + base32(lower, no pad)` of 16 HKDF bytes (info `'peer'`). The salt = 16 HKDF bytes (info `'salt'`).
- With a password: `pw = PBKDF2(normalizePassword(password), salt, 600000, 256 bits)`, and the IKM for `'read'`/`'enc'` = `K ‖ pw`.
- HKDF info strings include `exp` and the flag: `` `notepadz-share-v1|${info}|${exp}|${flag}` ``.
- Tests may pass a lower iteration count via an exported `__setPbkdf2Iterations` hook (test-only, documented).

- [ ] **Step 1: Failing tests.**
  - `peerId and salt need only the key`: same `K`/`exp`/flag with password `'a…'` vs `'b…'` → same `peerId`; different `readToken`.
  - `password changes readToken and encKey`.
  - `exp and flag are bound`: changing `exp` or the flag changes `peerId` and `readToken`.
  - `encrypt → decrypt round-trips a snapshot (with and without password)`.
  - `decrypt with wrong secrets throws`.
  - `unpack rejects tampered or non-snapshot data`.
  - `timingSafeEqual`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement with `crypto.subtle` (`importKey('raw',…,'HKDF')`, `deriveBits`, `PBKDF2`, `AES-GCM`) and `CompressionStream('deflate-raw')` / `DecompressionStream`.
- [ ] **Step 4:** Run. Expected: PASS. Measure PBKDF2 at 600k in a browser later (Task 11); jsdom tests use the hook.
- [ ] **Step 5: Commit:** `feat(share): add share key derivation and snapshot encryption`

### Task 3: Shares table (schema v2) and repository

**Files:**
- Modify: `src/db/db.ts` (`SCHEMA_VERSION = 2`; `this.version(2).stores({ ...v1, shares: '&id, expiresAt, noteId' })`, which only adds the table)
- Create: `src/features/share/sharesRepo.ts`
- Test: `src/features/share/sharesRepo.test.ts`, and extend `src/db/notesRepo.test.ts` with `v1 database upgrades to v2 without touching notes`

**Interfaces:**
- Produces:
```ts
interface ShareRow { id: string; noteId: string; title: string; keyB64: string; exp: number;
  peerId: string; readTokenHash: string; password: string | null; iv: Uint8Array; ciphertext: Uint8Array;
  createdAt: number; expiresAt: number; opens: number; lastOpenedAt: number | null;
  failures: number; coolDownUntil: number; coolDownMs: number; stopped: boolean }
putShare(db, row): Promise<void>
getShare(db, id): Promise<ShareRow | undefined>
listActiveShares(db, now): Promise<ShareRow[]>        // !stopped && expiresAt > now, soonest first
updateShare(db, id, patch: Partial<ShareRow>): Promise<void>
deleteShare(db, id): Promise<void>
purgeEndedShares(db, now): Promise<string[]>          // deletes stopped or expired rows
```
- `NotepadzDB.shares: Table<ShareRow, string>`.

- [ ] **Step 1: Failing tests.**
  - `upgrades a v1 database to v2 without touching notes`: create a v1 DB by hand (Dexie with `version(1)`), insert a note, close it, open with `openDb` → the note is intact and `shares` is empty.
  - `listActiveShares orders by expiry and hides stopped/expired`.
  - `purgeEndedShares removes stopped and expired rows only`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS. `npm test` stays green (the bootstrap and persistence suites open the DB).
- [ ] **Step 5: Commit:** `feat(db): add shares table (schema v2)`

### Task 4: Transport interface and implementations

**Files:**
- Create: `src/features/share/protocol.ts`, `transport.ts`, `memoryTransport.ts`, `channelTransport.ts`, `peerTransport.ts`, `pickTransport.ts`
- Test: `src/features/share/transport.test.ts` (memory and channel; PeerJS is checked manually in Task 11)
- `npm install peerjs`

**Interfaces:**
- Produces:
```ts
type Hello = { type: 'hello'; v: 1; readToken: string /* base64url */ }
type Reply =
  | { type: 'share'; iv: string; ciphertext: string }   // base64url
  | { type: 'denied' } | { type: 'expired' } | { type: 'stopped' }
  | { type: 'wait'; retryInMs: number }
isHello(x: unknown): x is Hello;  isReply(x: unknown): x is Reply
interface Conn { send(msg: Hello | Reply): void; onMessage(cb: (msg: unknown) => void): void;
  onClose(cb: () => void): void; close(): void }
interface Host { stop(): void }
interface ShareTransport {
  /** Register `peerId` and accept connections. Rejects if the id is taken or signaling is down. */
  host(peerId: string, onConn: (c: Conn) => void): Promise<Host>
  /** Connect to `peerId`. Rejects with TransportError('offline' | 'blocked' | 'unavailable'). */
  connect(peerId: string, timeoutMs?: number): Promise<Conn>
}
class TransportError extends Error { kind: 'offline' | 'blocked' | 'unavailable' | 'taken' }
createMemoryTransport(): ShareTransport          // shared registry per factory instance
createChannelTransport(name?: string): ShareTransport   // BroadcastChannel; works across tabs
createPeerTransport(): ShareTransport            // PeerJS cloud; maps peer errors to TransportError kinds
pickTransport(): ShareTransport                  // channel if localStorage['notepadz:share-transport']==='channel', else PeerJS
```
- PeerJS error mapping:
  - `peer-unavailable` → `offline`;
  - `network` / `server-error` / `socket-error` → `unavailable`;
  - ICE `failed` → `blocked`;
  - `unavailable-id` → `taken`.
- PeerJS is imported lazily inside `createPeerTransport` (dynamic `import('peerjs')`), so it's never in the startup bundle.

- [ ] **Step 1: Failing tests (run against memory and channel):**
  - `host and connect exchange messages`;
  - `connect to an unknown id rejects offline`;
  - `hosting an id twice rejects taken`;
  - `host.stop closes connections and frees the id`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. The channel transport uses message envelopes `{to, from, connId, kind, payload}` on one `BroadcastChannel('notepadz-share-test')`.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5: Commit:** `feat(share): add share transports (PeerJS, BroadcastChannel, in-memory)`

### Task 5: Share host (sender logic)

**Files:**
- Create: `src/features/share/host.ts`
- Test: `src/features/share/host.test.ts` (memory transport, fake-indexeddb, injected clock)

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces:
```ts
interface CreateOptions { expiresInMs: number; password: string | null }
interface CreatedShare { id: string; link: string; password: string | null; expiresAt: number; message: string }
interface ShareHost {
  create(note: Note, o: CreateOptions): Promise<CreatedShare>   // throws ShareError('too-large'|'invalid-password'|'unavailable')
  stop(id: string): Promise<void>
  resume(): Promise<void>                    // purge ended, then serve every active row (with lock)
  active(): ShareRow[]                       // in-memory mirror for the UI
  subscribe(cb: () => void): () => void
  dispose(): void
}
createShareHost(o: { db: NotepadzDB; transport: ShareTransport; appUrl: string;
  now?: () => number; locks?: LockManagerLike; onStoppedElsewhere?: (id: string) => void }): ShareHost
export const MAX_SNAPSHOT_BYTES = 5 * 1024 * 1024
export const COOL_DOWN_START_MS = 30_000
```
- **Handshake order** (spec §5.4.6): stopped → expired → cool-down `wait` → token mismatch `denied` (`failures++`; at 5 → `coolDownUntil = now + coolDownMs`, `coolDownMs *= 2`, `failures = 0`) → `share` (`opens++`, `lastOpenedAt`).
- **Persistence:** counters are written to the row.
- **Expiry:** a timer at `expiresAt` stops hosting and deletes the row.
- **Locking:** serving is wrapped in `navigator.locks.request('share:'+id, …)`, released on stop or expiry. `LockManagerLike` is injectable, with a fake in tests.

- [ ] **Step 1: Failing tests.**
  - `create stores ciphertext, never the plaintext, and returns link + message`: the row's ciphertext ≠ content bytes, and the content string doesn't appear in the row JSON (except as `title`).
  - `right token gets the share and counts an open`.
  - `wrong token gets denied and no ciphertext`.
  - `5 failures start a 30s cool-down that doubles`: replies `wait` with `retryInMs ≤ 30000`; after it passes, 5 more failures → 60000.
  - `expired share replies expired and is deleted at expiry`.
  - `stop replies stopped to new connections, then deletes the row`.
  - `resumes serving after restart; expired rows deleted`: new host on the same DB → `resume()` serves the same `peerId`.
  - `only one host serves a share (lock)`: two hosts on one DB → only the lock holder calls `transport.host`; when the first disposes, the second takes over.
  - `rejects snapshots over 5 MB and invalid passwords`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5: Commit:** `feat(share): serve shares from the sender with expiry, stop and password cool-down`

### Task 6: Receiver (recipient logic)

**Files:**
- Create: `src/features/share/receiver.ts`
- Test: `src/features/share/receiver.test.ts`

**Interfaces:**
- Produces:
```ts
type ReceiveState =
  | { s: 'expired' } | { s: 'need-password' } | { s: 'connecting' }
  | { s: 'waiting'; expiresAt: number } | { s: 'wrong-password' } | { s: 'cooldown'; retryAt: number }
  | { s: 'stopped' } | { s: 'blocked' } | { s: 'unavailable' } | { s: 'corrupt' }
  | { s: 'ready'; snapshot: Snapshot; expiresAt: number }
createReceiver(o: { parts: ShareLinkParts; transport: ShareTransport; now?: () => number;
  retryMs?: number }): { state(): ReceiveState; subscribe(cb): () => void;
  submitPassword(pw: string): void; retry(): void; dispose(): void }
```
- **Start:** `exp*1000 ≤ now` → `expired` (no connection). With a password → `need-password`. Otherwise go straight to connecting.
- **Offline sender:** `offline` → `waiting`, retry every `retryMs` (default 4000) until expiry, then `expired`.
- **Replies:** `denied` → `wrong-password`; `wait` → `cooldown`; `share` → decrypt, unpack → `ready`; a decrypt failure → `corrupt`.

- [ ] **Step 1: Failing tests (memory transport + a real host from Task 5):**
  - `expired link never connects` (spy on `transport.connect`);
  - `asks for the password before connecting`;
  - `waits while the sender is offline, then connects when it comes online`;
  - `wrong password → wrong-password, right one → ready with snapshot`;
  - `cool-down surfaces as cooldown with retryAt`;
  - `stopped share → stopped`;
  - `switches waiting → expired at expiry`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5: Commit:** `feat(share): add recipient state machine`

### Task 7: Share dialog (sender UI) and entry points

**Files:**
- Create: `src/features/share/ShareDialog.tsx`, `src/features/share/shareStore.ts`
- Modify:
  - `src/commands/registry.ts`: `note.share`, "Share note…", section Note, keywords `['link','send','password']`, no shortcut, `when: hasActive`;
  - `src/features/tabs/TabContextMenu.tsx`: "Share…";
  - `src/app/layout/StatusBar.tsx`: a share icon button (`aria-label="Share note"`);
  - `src/app/App.tsx`: lazy-mount `ShareDialog` like the other dialogs; create the `ShareHost` once.
- Test: `src/features/share/ShareDialog.test.tsx`

**Interfaces:**
- Consumes: `ShareHost` (Task 5), passwords and message (Task 1).
- Produces:
  - `shareStore`: `{ dialogNoteId: string | null; open(noteId): void; close(): void }`.
  - `getShareHost(): ShareHost | null` and `setShareHost(h)`, a module singleton set in `main.tsx`. In memory mode it's null, and the dialog explains that sharing needs browser storage.
- **Dialog per spec §5.1:**
  - Radix Dialog, Segmented expiry, Toggle "Protect with password" (default on), password field + ↻, size line, Create link.
  - After creation: link + Copy link, password + Copy password, "✓ Message copied", countdown + bar, tip, "Keep Notepadz open until they've opened it", Stop sharing, Done.
  - Auto-copy writes `message` via `navigator.clipboard.writeText`. If that fails, show "Couldn't copy automatically — use the buttons".

- [ ] **Step 1: Failing tests** (fake host and clipboard spy):
  - `opens from the command and the tab menu`;
  - `password on by default with a generated value; ↻ changes it`;
  - `turning the password off hides it and the message has no Password line`;
  - `countdown in the dialog ticks every second` (fake timers: 5:00 → 4:59 → 4:58);
  - `custom password shorter than 8 disables Create`;
  - `create copies the message and shows link, password and countdown`;
  - `stop calls host.stop and closes`;
  - `shows the 5 MB limit and blocks oversize notes`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5: Commit:** `feat(share): add share dialog with expiry, password and copied message`

### Task 8: Active-shares indicator and cross-window stop

**Files:**
- Create: `src/features/share/SharesIndicator.tsx`
- Modify:
  - `src/app/layout/StatusBar.tsx`: render the indicator;
  - `src/features/sync/sync.ts`: forward a `{t:'share-stopped', id}` message to a callback (and add a `share-created` message so other windows refresh their list);
  - `host.ts`: an `onStoppedElsewhere` hook that, when called, stops serving that id.
- Test: `src/features/share/SharesIndicator.test.tsx`, plus extending `src/features/sync/sync.test.ts`

**Interfaces:**
- Consumes: `ShareHost.active()` and `subscribe`.
- Produces:
  - **Indicator:** "Sharing 1 note · 4:07 left", or "Sharing 2 notes · next ends in 0:52".
  - **Popover rows:** title, time left, "Opened N times · last at <time>", Copy message, Stop sharing.
  - **Ended:** a toast "Share ended" when a share ends.

- [ ] **Step 1: Failing tests:**
  - `hidden with no shares; shows count and soonest time left`;
  - `indicator and each popover row tick every second`;
  - `lists every active share, including ones created in another window`;
  - `popover copy message includes the stored password`;
  - `stop from the popover ends the share`;
  - `stop from another window ends serving` (two hosts sharing a stub channel via sync);
  - `toast when a share ends`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5: Commit:** `feat(share): show active shares in the status bar and stop them from any window`

### Task 9: Recipient share view and lightweight entry

**Files:**
- Create: `src/features/share/ShareView.tsx`
- Modify:
  - `src/main.tsx`: if `parseShareHash(location.hash)` succeeds, render `<ShareView>` **without** `bootstrap`, persistence, sync or the Welcome note. Remove the hash with `history.replaceState`. Save/Close then call a `bootApp()` extracted from the current `main()`.
  - `src/app/App.tsx` stays as is.
- Test: `src/features/share/ShareView.test.tsx`

**Interfaces:**
- Consumes: `createReceiver` (Task 6), `pickTransport` (Task 4), `noteExportFile` + `downloadText` (backup), `newNote` after boot.
- Produces:
  - `bootApp(opts?: { addNote?: Partial<Note> }): Promise<void>`. With `addNote`, after boot it calls `newNote(addNote)`, so the note opens as the active tab.
  - **Screens per spec §5.3:**
    - expired;
    - password prompt;
    - connecting / waiting with countdown;
    - wrong password, cool-down;
    - stopped, blocked, unavailable, corrupt;
    - ready: read-only CodeMirror (`EditorState.readOnly`), Markdown Edit/Preview, the banner with a countdown that switches to "This link has expired · you can still save your copy", and Save to my notes / Download / Close.

- [ ] **Step 1: Failing tests** (memory transport, real host):
  - `opening a share link creates no notes`: render `ShareView` → the IndexedDB `notes` count stays 0 and there's no Welcome;
  - `password flow to a read-only note`;
  - `save boots the app and opens a copy titled "<title> (shared)"`;
  - `download exports with the format's extension`;
  - `expired link shows the expired screen`;
  - `stays readable after the countdown hits zero`;
  - `banner countdown ticks every second` (fake timers).
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. Lazy-load `ShareView` and the editor pieces in `main.tsx`.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5: Commit:**
  - `refactor(app): extract app boot so other entry points can start it`
  - `feat(share): add recipient share view`

### Task 10: End-to-end (two tabs, BroadcastChannel transport)

**Files:**
- Create: `e2e/share.spec.ts`

- [ ] **Step 1: Specs** (both pages set `localStorage['notepadz:share-transport']='channel'` before load):
  - `share with password: copy message, open in second tab, enter password, save`. Use clipboard permissions, or read the dialog's link and password fields.
  - `wrong password then right password`.
  - `stop sharing makes the link say stopped`.
  - `expired link (exp in the past) shows expired without connecting`.
  - `axe: share dialog and share view have no serious violations`.
- [ ] **Step 2:** Run `npm run e2e`. Expected: PASS (fix in the owning task with `fix(share): …` commits).
- [ ] **Step 3: Commit:** `test(e2e): cover sharing a note between two tabs`

### Task 11: Real PeerJS check, docs

**Files:**
- Modify: `README.md` (a Sharing section: how it works, the privacy wording from the spec, "keep Notepadz open", the blocked-network note).

- [ ] **Step 1: Manual check** with real PeerJS. Use `npm run preview`, or the deployed site once the user approves pushing.
  - **Same machine:** share between two browser windows (Chrome + Safari).
  - **Separate networks:** share from a laptop to a phone on mobile data.
  - **What to record:** connect time, PBKDF2 duration at 600k on the phone (target ≤ 1.5 s; if slower, note it for the user rather than lowering the count unilaterally), and behaviour when the sender closes and reopens.
- [ ] **Step 2:** Write the README section.
- [ ] **Step 3:** Run the full gate: `npm test && npm run lint && npm run typecheck && npm run format:check && npm run build && npx playwright test`. Check that the startup bundle doesn't grow by more than 5KB gz (PeerJS and the share view are lazy).
- [ ] **Step 4: Commit:** `docs: explain sharing a note by link`
