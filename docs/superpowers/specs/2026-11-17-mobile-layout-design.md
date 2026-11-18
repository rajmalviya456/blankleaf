# Notepadz on phones — design

## Intent

Notepadz should be fully usable on a phone: everything you can do on the laptop, with touch
only, and it should feel crisp — large enough targets, no clipped bars, no zooming or jumping,
nothing that needs a hover, right-click, double-click or keyboard shortcut. Today a phone gets
the laptop layout squeezed: the sidebar covers ~75% of the screen, the toolbar and status bar
are cut off, the tab strip scrolls off, and several actions only exist for a mouse.

**The laptop layout does not change.** This is a separate phone layout plus touch fixes.

## Goals

- Every laptop capability is reachable on a 360–430px-wide phone, portrait.
- One thing on screen at a time; the note gets almost all the space.
- The formatting toolbar stays reachable while the on-screen keyboard is open.
- Every interactive target is at least 44×44 CSS px (visual can be smaller, hit area not).
- No hover-only, right-click-only, double-click-only or shortcut-only actions on touch devices.
- Back gesture / Android back button closes the top sheet or panel instead of leaving the app.
- Feels native: no input-focus zoom, no layout jump when the keyboard opens, safe areas
  (notch, home indicator) respected, smooth 150–200ms sheet transitions (none with
  reduced-motion).

## Non-goals

- Changing the laptop layout or its behaviour.
- Swipe gestures on list rows or between notes (they fight the system back gesture and text
  selection; long-press and ⋯ buttons cover the same actions).
- A tablet-specific layout. Tablets (≥ 640px) keep the laptop layout but get the touch fixes.
- Split (side-by-side) Markdown view on phones — there's no room; phones toggle Edit / Preview.
- Native apps.

## Anti-goals (failure even if it "works")

- Two ways of thinking about notes: the phone must use the same open-tabs model as the laptop.
- A phone screen full of chrome: our bars (top bar + toolbar) must not take more than ~110px
  when the keyboard is closed, not counting the device's safe-area insets.
- Any element that can only be reached by scrolling a bar sideways without a visual hint.
- Pinch-zoom disabled for users.

## Constraints

- Same codebase and store; React 19, Tailwind v4 tokens, Radix, CodeMirror 6, dnd-kit.
- Works in iOS Safari, Android Chrome, and installed as a PWA on both.
- Unit tests (Vitest + Testing Library) and Playwright e2e + axe must cover the phone layout.
  Playwright: use a 390×844 viewport with `hasTouch: true` and `isMobile: true` — not a device
  preset (presets were ruled out earlier because they spoof the user agent).
- Startup bundle must not grow noticeably: phone-only components load lazily where practical.

## Approaches considered

- **A — Note first, tab switcher in the title (chosen).** A slim top bar (☰ · title ⌄ · ⋯);
  open tabs slide up from the bottom; ☰ opens Notes / Search / Trash full-screen; ⋯ holds note
  actions; the toolbar rides above the keyboard. Keeps the laptop's mental model, leaves the
  most room for writing.
- B — App-style: notes list as home, editor with ‹ back, bottom navigation. Most native-feeling,
  but tabs become a different concept on the phone and it is the most rework.
- C — Laptop layout tightened (scrolling tab strip, drawer). Least work, but tiny tab targets
  and too much chrome.

The user picked A and asked that every element be covered and crisp.

## When the phone layout applies

`(max-width: 639px)` — portrait phones. Exposed as one hook (`useIsPhone()`, `matchMedia`, live)
so components and tests share it. Landscape phones (≥ 640px wide) get the laptop layout.
Separately, `(pointer: coarse)` (any touch device, including tablets in laptop layout) turns on
the touch fixes below.

### Switching layouts mid-session (rotate, resize)

Phone overlays (Library, Tabs sheet, Note menu, other sheets) are local UI state of the phone
layout, not stored in the session. When the layout switches to laptop they close and their
history entries are removed (`history.go(-n)` for the entries we pushed). The Library does not
reuse `session.sidebar`; the laptop sidebar keeps its own saved state, and reloading on a phone
never reopens the Library. Dialogs that exist on both layouts (Settings, Share, About…) stay
open and simply re-render as dialog vs sheet.

## The phone layout

```
┌──────────────────────────────┐  ← safe-area top
│ ☰   Sprint sync ⌄   👁  ⋯   │  top bar, 48px
├──────────────────────────────┤
│ # Sprint sync                │
│ Ship **tabs** and `export`.  │  editor (or preview)
│                              │
├──────────────────────────────┤
│ ↶ ↷ │ H▾ B I S <> 🔗 ☰▾ ❝ {}› │  toolbar, 44px, above keyboard
└──────────────────────────────┘  ← keyboard top / safe-area bottom
```

### Top bar (replaces tab bar, rail and status bar on phones)

- **☰** opens the Library (below).
- **Title ⌄** (note's display title, truncated) opens the Tabs sheet. Shows a small "Saving…" /
  "Not saved" text under the title only when not saved (the laptop's save indicator);
  "Not saved" is tappable and shows the error.
- **👁 Preview / ✎ Edit** toggle — only for Markdown notes. The phone's Edit ⇄ Preview choice
  is kept per tab in phone-only UI state and never overwrites the saved laptop view (edit /
  split / preview). A tab opens on the phone in Preview if its saved view is preview, else Edit.
- **⋯** opens the Note menu.
- With no note open: title area shows "Notepadz"; ⌄ still opens the Tabs sheet (with New note
  and Reopen closed tab); the empty state shows a big "New note" button.
- When a share is active, a small accent dot sits on ⋯ / ☰ (see Library footer).

### Tabs sheet (title ⌄)

Bottom sheet listing open tabs, pinned first (pin icon), active one highlighted.

- Tap a row → switch to it and close the sheet.
- **×** on each row (always visible) → close tab (pinned tabs ask to unpin, as on laptop).
- **⋯ on each row, or long-press** → tab actions sheet: Rename, Pin/Unpin, Duplicate,
  Share…, Copy text, Download, Close, Close others, Close tabs below (= "to the right"),
  Move to Trash. Same actions as the laptop's tab context menu.
- **Reorder:** drag handle (⠿) on each row; dnd-kit with a touch sensor (press-and-hold 200ms
  on the handle) — the row body stays scrollable.
- Footer: **＋ New note**, **Reopen closed tab** (disabled when none).
- Rename happens inline in the row (16px input, Enter/blur commits, Esc cancels).

### Library (☰)

Full-screen panel sliding from the left, with a close (‹) button and a segmented control:
**Notes | Search | Trash**.

- **Notes:** same list as the sidebar. Tap → open and close the Library. Each row has an
  always-visible **⋯** (and long-press) → Open, Pin/Unpin, Share…, Download, Move to Trash
  (with Undo toast). The hover trash icon is replaced by this on touch devices.
- **Search:** search box autofocuses (16px), results tap to open at the match.
- **Trash:** each row: Restore (visible button) and Delete permanently (in ⋯); Empty Trash
  stays, with its confirm.
- **Footer rows:** Settings, What's new, About, theme toggle (System/Light/Dark), and when
  sharing: "Sharing N notes · m:ss" opening the Active shares sheet.

### Note menu (⋯)

Bottom sheet with the active note's actions, grouped:

1. **Format: Python ›** (opens the format list sheet; search box on top) and **Wrap lines** toggle.
2. **Text size − 16 +**, **Find & replace**.
3. **Share…**, **Copy all text**, **Download**, **Duplicate**, **Pin/Unpin**, **Rename**.
4. **Zen mode**, **Commands…** (opens the command palette full-screen).
5. **Move to Trash** (danger colour).
6. Footer line: `Ln 4, Col 12 · 182 words · 1,204 chars` (or "large note" notice).

### Toolbar

- Same adaptive groups as the laptop (Markdown vs text tools). The right-hand note actions
  (copy, download, share, trash) and text size move to the ⋯ menu on phones.
- Docked to the bottom: above the keyboard when it is open (positioned with
  `visualViewport` height/offset), above the safe area when closed. The page itself never
  scrolls to make room; the editor shrinks.
- Horizontally scrollable with fade edges and a trailing **›** hint when more buttons exist.
- 44px tall, buttons 40×40 hit area. Buttons keep focus in the editor (as today).
- Hidden in Preview and in zen mode; respects the "Show toolbar" setting.

### Editor and preview

- Full width; gutter (line numbers) follows the setting but uses a narrower width on phones.
- **Phones have their own text size** (`phoneEditorFontSize`, default 16, range 16–28), so
  the laptop's size is never changed from the phone and iOS never zooms on focus. The ⋯ menu's
  "Text size − +" and Settings (on a phone) edit this value; the laptop keeps `editorFontSize`.
  Inputs and selects are 16px on phones.
- CodeMirror find panel: fits 360px (stacks find/replace rows, 16px inputs, 40px buttons).
- Preview: comfortable padding (16px), tables scroll horizontally inside themselves, code
  blocks scroll, images max-width 100%.

### Dialogs → sheets

On phones every dialog (Settings, Share, Active shares, Import, About, What's new, Keyboard
shortcuts, Command palette, Confirm) opens as a bottom sheet: full width, max-height ~92% of
the visible viewport, rounded top, a drag handle that can be dragged down to close (drag
starts only on the handle/header, so content scrolling is unaffected; written in-house on
pointer events with Radix Dialog — no new dependency), sticky header with title and ✕, content
scrolls, primary buttons pinned at the bottom above the safe area/keyboard. Confirm dialogs are
short sheets. The command palette is full-height with the input on top. Settings sections
stack; steppers and toggles get 44px targets. Keyboard shortcuts stays reachable (About) but
isn't promoted on phones.

### Command palette on phones

Commands that don't apply are hidden on phones: Toggle sidebar (replaced by "Open Library"),
Toggle toolbar stays, Next/previous tab and Go to tab 1–9 stay (useful with a hardware
keyboard) but aren't promoted, Keyboard shortcuts stays. "Markdown: edit / split / preview"
becomes "Markdown: edit / preview" on phones and toggles the phone view.

### Toasts

Bottom, full width minus 12px margins, above the toolbar/keyboard and safe area; action
buttons 44px tall.

### Zen mode

Hides the top bar and toolbar; a small floating "Exit zen" pill (top-right, 44px) replaces the
Esc hint.

### Back button

Opening a sheet or the Library pushes a history entry; Back closes the topmost one. Closing it
with ✕ pops that entry. Share links (`#/s/…`) keep working.

### Share recipient page (`#/s/…`)

Banner wraps to two lines; Save / Download / Preview buttons in one row below it with 44px
targets; password card fits 360px with a 16px input.

### Touch fixes for every touch device (`pointer: coarse`, laptop layout included)

- Tab close × always visible on touch; long-press a tab opens its context menu (Radix
  context menu already handles long-press on touch — verify on iOS; fall back to a 500ms
  press timer if not).
- Double-click rename also available via the tab menu (already there).
- Notes list ⋯ button replaces hover-only trash.
- Drag-to-reorder tabs uses a press-and-hold touch sensor so horizontal scrolling still works.
- `:hover` styles don't stick after a tap (wrap hover styles in `@media (hover: hover)` where
  they'd otherwise stay highlighted).

### Page-level

- `viewport` meta adds `viewport-fit=cover`; pinch-zoom stays allowed.
- Use `100dvh` and `env(safe-area-inset-*)` for top bar, toolbar, sheets and toasts.
- `theme-color` follows light/dark so the browser bar matches.
- No horizontal page scroll at 360px (test).
- Tap highlight: `-webkit-tap-highlight-color: transparent` with our own pressed states.

## Testing

- Unit: `useIsPhone`, Tabs sheet (switch, close, rename, pin, reorder via keyboard sensor),
  Library tabs and row actions, Note menu actions, toolbar visibility rules, preview toggle,
  font-size clamp, back-button handling (history push/pop).
- e2e at 390×844 touch: create a note, type, bold via toolbar, switch tabs via title, open a
  note from the Library, trash with Undo, Markdown preview toggle, share dialog opens as sheet,
  settings change; axe in light and dark; no horizontal overflow at 360px; laptop e2e suite
  unchanged and still green.
- Manual: iOS Safari + Android Chrome, keyboard open/close, installed PWA, rotate.

## Decided by me (check these)

- Breakpoint 640px; landscape phones use the laptop layout.
- No swipe gestures in this version.
- Phones show Edit ⇄ Preview only (no split).
- Phone font size floor of 16px.
- Copy/download/share/trash and text size move from the toolbar to ⋯ on phones.
- Status-bar details live in the ⋯ menu footer; save state shows under the title only when
  not saved.

- Phone overlays are local state; layout switches close them; the Library doesn't reuse the
  laptop sidebar state.
- Separate phone text size (default 16) instead of a clamp on the shared setting.
- Phone Edit/Preview is phone-only state; the laptop's saved split view is never overwritten.
- Sheets close by dragging the handle; built in-house, no new library.
- The 110px chrome budget excludes safe-area insets.

## Left to the builder

Exact component split, animation curves, icon choices (lucide), how the visualViewport
tracking is implemented, and test file layout.
