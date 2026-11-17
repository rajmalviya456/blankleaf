# Notepadz — Share a note by link (live handoff)

Date: 2026-11-17
Status: Draft, awaiting approval
Builds on: `docs/superpowers/specs/2026-11-16-notepadz-design.md` (replaces its §10a direction)

## 1. Intent

The user wants to send a note to someone **easily, with a link**, with these properties:
- The link **really expires**, by default after **5 minutes**.
- It's **password-protected by default**.
- Notepadz stays **free of any server the user has to run**.

The model is a **live handoff**: the note travels directly from the sender's browser to the
recipient's, peer to peer, while the sender's Notepadz is open. The sender's browser is the only
place the shared copy exists, so when the share ends there is nothing left anywhere to fetch. That
makes the expiry real.

## 2. Goals, non-goals, anti-goals

**Goals**
- **Share popup:** "Share…" opens a popup where the user picks an expiry and a password, then
  creates a link.
- **Copied message:** the link, the password and the expiry date and time go to the clipboard as a
  ready-to-send message.
- **Recipient view:** the recipient opens the link and sees a read-only note after entering the
  password. They can **Save to my notes** or **Download**.
- **Real expiry:** after the expiry, or after **Stop sharing**, the link can never deliver the note
  again.
- **Survives a restart:** closing and reopening Notepadz before the expiry resumes the share, and the
  same link keeps working.

**Non-goals (v1)**
- Running or deploying any server. A free public signaling service is used only for introductions
  (§5.4).
- Running our own relay (TURN). *(Final-review ruling: PeerJS's default ICE config already includes its
  free public TURN relay; it's kept because it rescues networks that block direct connections, and it
  only ever forwards DTLS-encrypted, separately AES-encrypted bytes. If it can't help, v1 explains the
  failure.)*
- Live updates: the recipient gets a **frozen snapshot** taken when the link was created.
- Burn-after-first-view, sharing several notes in one link, a "My shared links" history beyond the
  active-shares indicator, editing by the recipient, and accounts.

**Anti-goals (a failure even if it "works")**
- **Leaking content.** No content, key or password may ever reach the signaling service or any
  server.
- **A link that works after it expired or was stopped.**
- **Silently changing the recipient's notes.** Nothing is added until they click Save.
- **Overstating the protection.** The UI must say plainly that anyone with the link (and password)
  can read the note until it expires, and that expiry can't un-share what was already opened.

## 3. Constraints

- The app is a static SPA on GitHub Pages at `https://rajmalviya456.github.io/notepadz/`, with no
  response headers and no backend.
- Transport is WebRTC data channels through **PeerJS**, using its free public cloud signaling
  server and the default public STUN servers.
- **The sender must be online** with Notepadz open (a background tab is fine) for the recipient to
  receive the note. A sleeping laptop or a closed browser pauses the share.
- About 1 in 10 networks block direct peer connections. Without TURN, those handoffs fail.
- Crypto uses WebCrypto only (no crypto libraries). Compression uses `CompressionStream`.

## 4. Approaches considered

| | How | Real expiry | Chosen? |
|---|---|---|---|
| Link-only (data in the URL, advisory expiry) | Encrypted note inside the link | No | No — expiry would be a label only |
| **Live handoff (P2P)** | Sender's browser serves the encrypted snapshot over WebRTC until expiry | **Yes** | **Yes** — the user wants no extra server, and the 5-minute handoff fits "send it now" |
| Third-party zero-knowledge paste service | Upload ciphertext to someone else's service | Yes | No — depends on a stranger's service and its CORS and terms |
| Own Cloudflare Worker (encrypted upload) | About 100 lines on a free Worker | Yes | No — the user prefers not to run a server; kept as a later fallback option |

JWT/JWE was considered and rejected: `exp` is only enforceable by a server-side verifier.

## 5. Design

### 5.1 Share popup (sender)
Opened from the tab context menu ("Share…"), the command palette ("Share note…") and a share icon
in the status bar. The popup has these parts, in order:
- **Expiry:** a segmented control with **5 min** (default), 1 hour, 1 day and 7 days.
- **Protect with password:** a switch, **on** by default.
  - **Generated password:** 12 characters from an alphabet without look-alike characters (no
    0/O/1/l/I), shown grouped as `xxxx-xxxx-xxxx`. A ↻ button makes a new one.
  - **Editable:** a custom password must be at least 8 characters.
  - **Switch off:** the field hides.
  - **Fixed after creation:** the password is decided before the link is created, because it's part
    of the encryption.
- **Explanation:** one line saying the note is encrypted in the browser, sent directly to the
  recipient, and that Notepadz must stay open until it's opened.
- **Size line:** "Size: 3.1 KB of 5 MB". The cap is **5 MB compressed**.
- **Create link.**

After creation, the popup shows:
- **Link** with **Copy link**.
- **Password** with **Copy password** (only when the password is on).
- **"✓ Message copied"**, plus a live **countdown** and a bar.
- **Tip:** for confidential notes, send the password another way. Sent together, it only protects
  against someone seeing just the link.
- **"Keep Notepadz open until they've opened it."**
- **Stop sharing** and **Done**.

**Copied message (exact format).** It's copied automatically on create. The Password line is
omitted when the password is off. The date and time use the sender's locale and time zone:
```
Hey! A note was shared with you on Notepadz.

Open it: <link>
Password: <password>

This link expires on <Nov 17, 2026> at <2:37 PM> (in <5 minutes>).
```
The note title is **not** included, because notification previews would expose it.

### 5.2 Active shares indicator (sender)
- **Indicator:** while any share is active, the status bar shows "Sharing 1 note · 4:07 left", or
  "Sharing 2 notes · next ends in 0:52".
- **Click:** opens a small popover listing each active share with:
  - the note title,
  - time left,
  - "Opened N times · last at 2:35 PM",
  - **Copy message** (same format as §5.1, password included) and **Stop sharing**.
- **Every window:** every open Notepadz window shows the indicator and can Stop a share. Stop
  deletes the row and announces `{t:'share-stopped', id}` on the existing BroadcastChannel; the
  serving window stops at once. *(Builder-check call.)*
- **End of a share:** at expiry, or when stopped, the share disappears and a toast says "Share ended".

### 5.3 Recipient view
Opening a link (`…/notepadz/#/s/<key>.<exp>.<p|n>`) shows the **share view**, a lightweight entry
point. It does **not** create the Welcome note, open the notes database, start persistence or sync,
or touch the recipient's notes. The full app boots only when the recipient clicks **Save to my
notes** (which adds the note and opens it) or **Close** (which opens their normal Notepadz).
*(Builder-check call.)*

The link carries the expiry time, so the recipient always knows it, even when the sender is
offline. *(Builder-check call.)* States:
1. **Expired** (checked first, from the link): "This shared note has expired. Ask the sender for a
   new link." No connection attempt.
2. **Password** (if the link says the share is protected): asked **before** connecting. The sender
   checks it (§5.4), so a wrong password never reveals any data.
3. **Connecting…**, then **Waiting for the sender to come online… · expires in 3:10**: keep retrying
   while the page is open and the link hasn't expired; switch to state 1 the moment it expires.
4. **Wrong password**: "That password doesn't open this note." Back to state 2. After 5 wrong tries
   the sender refuses all attempts for 30 seconds, doubling each time (sender-enforced).
5. **Stopped**: "The sender stopped sharing this note."
6. **Note**:
   - a read-only CodeMirror view in the note's format with syntax highlighting (Markdown gets
     Edit/Preview);
   - a banner: "Shared note · expires in 3:12";
   - **Save to my notes**, which creates a new note (a copy titled "<title> (shared)") and opens it;
   - **Download**, which exports a file with the format's extension;
   - **Close**.

   At zero the note **stays readable** and Save and Download keep working; the banner changes to
   "This link has expired · you can still save your copy". Expiry stops new opens, not a copy
   already received. *(Builder-check call.)*
7. **Couldn't connect directly**: "Couldn't connect to the sender's browser. Some networks block
   direct connections — try another network (e.g. phone hotspot)."

After reading the key, the share view removes `#/s/…` from the address bar (`history.replaceState`).

### 5.4 Crypto and protocol
1. **Snapshot**: `{v:1, title, format (language), mode, content}`, as JSON, compressed with
   `deflate-raw`.
2. **Link**: `#/s/<base64url(K)>.<exp>.<p|n>`.
   - `K` is 32 random bytes.
   - `exp` is the expiry in seconds since the epoch, in base36.
   - `p|n` says whether a password is set.
3. **Password normalisation** *(builder-check call)*: generated passwords use lowercase letters and
   digits without look-alikes, shown as `xxxx-xxxx-xxxx`. Every password (generated or custom) has
   spaces and hyphens removed before use, and is otherwise case-sensitive. The minimum is 8
   characters after normalisation.
4. **Derivations**: HKDF-SHA256 from `K`, with info strings, and with `exp` and the flag bound in.
   - `peerId` (128-bit, base32): the sender's PeerJS id. It needs only `K`, so the recipient can
     connect.
   - `salt` (16 bytes): derived from `K`, so the recipient has it before connecting.
   - With a password: `pw = PBKDF2-SHA256(normalised password, salt, 600000)`, then
     `readToken = HKDF(K ‖ pw, 'read')` and `encKey = HKDF(K ‖ pw, 'enc')`.
   - Without a password: `readToken = HKDF(K, 'read')` and `encKey = HKDF(K, 'enc')`.
5. **Encryption**: AES-256-GCM with a random 96-bit IV, and AAD = `"notepadz-share-v1" ‖ exp ‖ flag`.
   It's computed once at creation and stored (§5.5). The plaintext snapshot isn't kept in share
   storage.
6. **Handshake**: data is sent only after the password check passes. *(Builder-check call.)*
   - The recipient sends `{type:'hello', v:1, readToken}`.
   - The sender checks, in order:
     - stopped → `{type:'stopped'}`
     - `now ≥ expiresAt` → `{type:'expired'}`
     - in cool-down → `{type:'wait', retryInMs}`
     - `readToken` mismatch (constant-time compare) → `{type:'denied'}`, counting a failure
     - otherwise → `{type:'share', iv, ciphertext}`, counting an open
   - Someone with the link but without the password never receives ciphertext, so the password
     can't be guessed offline. Online guessing is limited by the cool-down.
7. **Decryption**: the recipient decrypts locally. A GCM failure at this point means a corrupted
   transfer; show "Couldn't open this note" with a retry.
8. **What the signaling service sees**: peer ids, IP addresses and connection metadata only.
   Content, `K`, the password and `readToken` travel only over the DTLS-encrypted WebRTC data
   channel, and the payload is encrypted again by us.

### 5.5 Persistence and lifecycle (sender)
- **Storage:** a new Dexie table, `shares`, added in schema version 2. The migration only adds the
  table. Each row: `{id, noteId, title, keyB64, exp, peerId, readTokenHash, password|null, iv,
  ciphertext, createdAt, expiresAt, opens, lastOpenedAt, failures, coolDownUntil, stopped}`.
- **Password stored locally** *(builder-check call)*: the share row keeps the password on the
  sender's own device, next to the notes it already stores in plain form, so **Copy message** works
  after a restart. It's deleted with the row.
- **On app start**, for every share with `expiresAt > now`:
  - re-register its `peerId` with PeerJS and serve again,
  - delete expired rows (and their keys) immediately.
- **Expiry and stop:** stop serving, destroy the peer and delete the row.
- **Several windows:** only one window serves a given share. Use a Web Lock named `share:<id>`,
  which another window acquires if the first one closes.
- **Clear all data** deletes every share, so their links die.
- **Export never includes shares.**

### 5.6 Errors and edge cases
- **PeerJS cloud unreachable:** creating a link fails with "Couldn't reach the sharing service. Check
  your connection and try again." Nothing is stored.
- **Peer id taken** (very unlikely, or a duplicate window): handled by the Web Lock. Otherwise retry
  once.
- **Sender clock wrong:** expiry is decided by the sender's clock, which is accepted.
- **Recipient opens the link in their own Notepadz** (same origin): the share view still works
  without changing their data until Save.
- **The recipient is the sender** (same browser, testing): it works.

## 6. Testing
- **Unit tests:** password generator (alphabet, length, grouping), key/link encode and decode, HKDF
  derivations, encrypt/decrypt round trip with and without a password, wrong password failing,
  message formatting (date, time, relative time, password line omitted), size cap, expiry checks.
- **Transport:** behind a small interface (`ShareTransport`) with a PeerJS implementation and an
  **in-memory implementation for tests**. Integration tests cover sender plus recipient:
  - handshake,
  - wrong `readToken` → gone,
  - expired → gone,
  - stop → gone,
  - resume after "restart" (new sender instance from storage),
  - Web Lock single-server.
- **E2E (Playwright, two pages, in-memory transport injected through a test flag):** create a share,
  open it in a second page, enter the password, Save. Also an expired link and a stopped link.
- **A manual check over real PeerJS** between two browsers or devices before release.

## 7. Left to the builder
- PeerJS configuration details (retry and backoff timings for "waiting for sender").
- Exact copy for small helper texts, the countdown formatting style, and the popover layout.
- Message chunking and backpressure for multi-MB payloads (PeerJS binary serialization may cover
  it).
- Whether the share view lazy-loads (recommended: yes, the same as the other dialogs).
