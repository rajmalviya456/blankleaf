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
  | 'xml'
  | 'toml'
  | 'dockerfile'
  | 'diff'
  | 'java'
  | 'cpp'
  | 'go'
  | 'rust'
  | 'php'
  | 'ruby'
  | 'kotlin'
  | 'csharp'
  | 'swift'
  | 'lua'
  | 'perl'
  | 'powershell'
  | 'r'
  | 'scss'
  | 'less'
  | 'nginx'
  | 'ini'

/** How the notes list is ordered (pinned notes always come first). */
export type NotesSort = 'edited' | 'created' | 'title'

/** A locked note's text, encrypted with its password (see features/lock). */
export interface LockedContent {
  v: 1
  salt: string
  iv: string
  data: string
  iterations: number
  /** The note it was first locked on. Part of what's authenticated, and copied with the data. */
  origin: string
}

export interface Note {
  id: string
  /** Explicit name; null means "derive from first line" (see displayTitle). */
  title: string | null
  content: string
  mode: NoteMode
  language: LanguageId
  wrap: boolean
  /** Browser spell check for this note. Off unless turned on. */
  spellcheck?: boolean
  /** Labels for organizing notes (see domain/tags). */
  tags?: string[]
  /** Target number of words for this note. */
  wordGoal?: number
  /** This note's text size on laptops, when it differs from Settings. */
  fontSize?: number
  /** This note's text size on phones, when it differs from Settings. */
  phoneFontSize?: number
  /** This note's editor font, when it differs from Settings. */
  font?: EditorFont
  /** Set when the note is password-locked; `content` is then empty. */
  locked?: LockedContent
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
  /** User toggled wrap on this tab, so format changes stop choosing it. */
  wrapTouched?: boolean
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
  /** Note shown beside the active one on wide screens. */
  splitNoteId?: string | null
}

/** Editor typeface. All use fonts already on the device, so nothing downloads. */
export type EditorFont = 'mono' | 'sans' | 'serif' | 'rounded'

export interface Settings {
  theme: ThemePref
  /** '' means use the theme's default accent. */
  accent: string
  uiFontSize: number
  editorFont: EditorFont
  editorFontSize: number
  /** Phones keep their own text size so the laptop's never changes from a phone. */
  phoneEditorFontSize: number
  lineHeight: number
  defaultMode: NoteMode
  defaultWrap: boolean
  lineNumbers: boolean
  tabSize: number
  highlightActiveLine: boolean
  /** A faint line at this column in code notes; 0 for none. */
  codeRuler: number
  /** Dictionary for spell check; 'auto' follows the browser's language. */
  spellLanguage: 'auto' | 'en-US' | 'en-GB' | 'en-AU' | 'en-CA' | 'es'
  showToolbar: boolean
  /** 0 disables the reminder. */
  backupReminderDays: number
  notesSort: NotesSort
}
