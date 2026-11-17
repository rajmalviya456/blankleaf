import type { Note, Session, Settings } from './types'

export const CLOSED_STACK_MAX = 20
export const TRASH_RETENTION_DAYS = 30
export const EDITOR_FONT_MIN = 10
export const EDITOR_FONT_MAX = 28
/** 16px is the smallest size at which iOS doesn't zoom into a focused field. */
export const PHONE_FONT_MIN = 16
export const PHONE_FONT_MAX = 28

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
  showToolbar: true,
  backupReminderDays: 7,
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

export const WELCOME_CONTENT = `Welcome to Notepadz

Everything you type is saved in this browser automatically. Nothing leaves your machine.

Shortcuts (⌘ = Ctrl on Windows/Linux, Mod2 = ⌃⌥ on Mac, Alt elsewhere)
  ⌘K          Command palette
  Mod2+N      New note
  Mod2+W      Close tab
  Mod2+1…9    Jump to tab
  ⌘B          Toggle sidebar
  ⌘⇧F         Search all notes
  ⌘.          Zen mode
  F2          Rename tab

Back up regularly: Settings → Data → Export.
Delete this note whenever you like — it won't come back.
`

/** Editor text size for this device: phones use their own size, never below 16px. */
export function effectiveEditorFontSize(
  s: Pick<Settings, 'editorFontSize' | 'phoneEditorFontSize'>,
  phone: boolean,
): number {
  return phone ? Math.max(PHONE_FONT_MIN, s.phoneEditorFontSize) : s.editorFontSize
}
