import type { ThemePref } from '../lib/theme'

export type NoteMode = 'plain' | 'markdown'

export type LanguageId =
  | 'auto'
  | 'plaintext'
  | 'markdown'
  | 'javascript'
  | 'typescript'
  | 'json'
  | 'python'
  | 'sql'
  | 'html'
  | 'css'
  | 'yaml'
  | 'shell'
  | 'log'

export interface Note {
  id: string
  /** Explicit name; null means "derive from first line" (see displayTitle). */
  title: string | null
  content: string
  mode: NoteMode
  language: LanguageId
  wrap: boolean
  pinned: boolean
  createdAt: number
  updatedAt: number
  /** Set when moved to Trash. */
  deletedAt: number | null
  /** Incremented on every successful save; used for cross-window compare-and-set. */
  rev: number
}

export type PreviewMode = 'edit' | 'split' | 'preview'

export interface TabViewState {
  anchor: number
  head: number
  scrollTop: number
  previewMode: PreviewMode
}

export type SidePanel = 'notes' | 'search' | 'trash'

export interface Session {
  openTabIds: string[]
  activeTabId: string | null
  /** Most recent last. Capped at CLOSED_STACK_MAX. */
  closedStack: string[]
  perTab: Record<string, TabViewState>
  sidebar: { open: boolean; panel: SidePanel }
  zen: boolean
}

export interface Settings {
  theme: ThemePref
  /** '' means use the theme's default accent. */
  accent: string
  uiFontSize: number
  editorFont: 'mono' | 'sans'
  editorFontSize: number
  lineHeight: number
  defaultMode: NoteMode
  defaultWrap: boolean
  lineNumbers: boolean
  tabSize: number
  highlightActiveLine: boolean
  /** 0 disables the reminder. */
  backupReminderDays: number
}
