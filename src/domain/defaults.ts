import type { Note, Session, Settings } from './types'

export const CLOSED_STACK_MAX = 20
export const TRASH_RETENTION_DAYS = 30
export const EDITOR_FONT_MIN = 10
export const EDITOR_FONT_MAX = 72
/** 16px is the smallest size at which iOS doesn't zoom into a focused field. */
export const PHONE_FONT_MIN = 16
export const PHONE_FONT_MAX = 72

export const DEFAULT_SETTINGS: Settings = Object.freeze({
  theme: 'system',
  accent: '',
  uiFontSize: 13,
  editorFont: 'mono',
  editorFontSize: 14,
  phoneEditorFontSize: 16,
  lineHeight: 1.6,
  defaultMode: 'plain',
  defaultWrap: true,
  lineNumbers: true,
  tabSize: 2,
  highlightActiveLine: true,
  codeRuler: 80,
  spellLanguage: 'auto',
  showToolbar: true,
  backupReminderDays: 7,
  notesSort: 'edited',
}) as Settings

/** Merge stored settings over defaults, keeping only known keys with matching types. */
export function mergeSettings(stored: Partial<Settings> | undefined): Settings {
  const out: Settings = { ...DEFAULT_SETTINGS }
  if (!stored || typeof stored !== 'object') return out
  const target = out as unknown as Record<string, unknown>
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    const value = (stored as Record<string, unknown>)[key]
    if (value !== undefined && typeof value === typeof DEFAULT_SETTINGS[key]) target[key] = value
  }
  if (!['edited', 'created', 'title'].includes(out.notesSort)) out.notesSort = 'edited'
  if (![0, 80, 100, 120].includes(out.codeRuler)) out.codeRuler = DEFAULT_SETTINGS.codeRuler
  if (!['auto', 'en-US', 'en-GB', 'en-AU', 'en-CA', 'es'].includes(out.spellLanguage))
    out.spellLanguage = 'auto'
  return out
}

export function emptySession(): Session {
  return {
    openTabIds: [],
    activeTabId: null,
    closedStack: [],
    perTab: {},
    sidebar: { open: false, panel: 'notes' },
    zen: false,
  }
}

export function newNoteDraft(
  now: number,
  settings: Settings,
  id: string = crypto.randomUUID(),
): Note {
  return {
    id,
    title: null,
    content: '',
    mode: settings.defaultMode,
    language: 'auto',
    wrap: settings.defaultWrap,
    pinned: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    rev: 0,
  }
}

/** The first note anyone sees, and the "sample note": shows off Markdown, beside its preview. */
export const WELCOME_CONTENT = `# Welcome to Blankleaf

This is a **sample note**. Change anything, it's yours, and delete it when you're done.
Everything saves in this browser as you type. Nothing leaves your device unless you share it.

## A checklist

Tick the boxes in the preview.

- [x] Open Blankleaf
- [ ] Write something
- [ ] Share a note with an encrypted link

## A diagram

\`\`\`mermaid
flowchart LR
  Idea --> Draft --> Share
\`\`\`

## Code

\`\`\`js
const greet = (name) => \`Hello, \${name}!\`
\`\`\`

\`\`\`python
def greet(name):
    return f"Hello, {name}!"
\`\`\`

## Math

$$
e^{i\\pi} + 1 = 0
$$

## Keys

| Keys | What it does |
| --- | --- |
| Ctrl/⌘ K | Command palette |
| Alt N (⌃⌥N on a Mac) | New note |
| Ctrl/⌘ Shift F | Search all notes |
| Ctrl/⌘ / | All keyboard shortcuts |

Back up now and then: Settings → Data → Export, or pick a backup folder there.
`

/**
 * Editor text size for this device: the note's own size if it has one, else Settings. Phones use
 * their own size, never below 16px.
 */
export function effectiveEditorFontSize(
  s: Pick<Settings, 'editorFontSize' | 'phoneEditorFontSize'>,
  phone: boolean,
  note?: Pick<Note, 'fontSize' | 'phoneFontSize'>,
): number {
  if (phone) return Math.max(PHONE_FONT_MIN, note?.phoneFontSize ?? s.phoneEditorFontSize)
  return note?.fontSize ?? s.editorFontSize
}

/** A valid per-note text size for laptops or phones, or undefined. Also cleans backup files. */
export function cleanNoteFontSize(raw: unknown, phone: boolean): number | undefined {
  const [min, max] = phone ? [PHONE_FONT_MIN, PHONE_FONT_MAX] : [EDITOR_FONT_MIN, EDITOR_FONT_MAX]
  return typeof raw === 'number' && Number.isInteger(raw) && raw >= min && raw <= max
    ? raw
    : undefined
}
