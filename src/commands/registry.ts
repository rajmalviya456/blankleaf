/**
 * Every user action, defined once. The command palette, global shortcuts, the shortcuts
 * sheet and menus all read from here.
 */
import type { StoreApi } from 'zustand'
import { exportAll, pickFilesToImport, saveNoteAsFile } from '../features/backup/actions'
import { shareStore } from '../features/share/shareStore'
import { trashWithUndo } from '../features/sidebar/trashWithUndo'
import { exportNoteAs } from '../features/export/exportNote'
import { historyStore } from '../features/history/historyStore'
import { printStore } from '../features/print/printStore'
import { tagsStore } from '../features/tags/tagsStore'
import { lockStore } from '../features/lock/lockStore'
import { goalStore } from '../features/goal/goalStore'
import { isVoiceSupported, toggleVoice } from '../features/voice/voice'
import { newFromTemplate, TEMPLATES } from '../features/templates/templates'
import { nextThemePref } from '../lib/theme'
import { compareStore } from '../features/compare/compareStore'
import { symbolStore } from '../features/symbols/symbolStore'
import { readabilityStore } from '../features/readability/readabilityStore'
import { openSample } from '../features/sample/sample'
import { PHONE_QUERY } from '../lib/media'
import { phoneStore } from '../features/phone/phoneStore'
import { phoneViewFor } from '../features/phone/phoneView'
import { getActiveView } from '../features/editor/activeView'
import { runTransform, TRANSFORM_IDS, TRANSFORMS } from '../features/toolbar/transforms'
import { canFormat, runFormatCode } from '../features/toolbar/formatCode'
import type { Shortcut } from '../lib/shortcuts'
import type { AppState, AppStore } from '../store/store'
import { editingNote } from '../store/selectors'

export type CommandSection = 'Note' | 'Tabs' | 'View' | 'Data' | 'App'

export interface CommandContext {
  store: StoreApi<AppStore>
}

export interface Command {
  id: string
  title: string
  section: CommandSection
  keywords?: string[]
  shortcuts: Shortcut[]
  /** Hidden from the palette and inert as a shortcut when false. */
  when?: (s: AppState) => boolean
  /** Show in the command palette (tab jumps are shortcut-only). */
  palette?: boolean
  /** Only on phones (< 640px) or only in the laptop layout. */
  only?: 'phone' | 'laptop'
  /** Palette title on phones, when the command does something different there. */
  phoneTitle?: string
  run(ctx: CommandContext): void
}

const hasActive = (s: AppState) => s.session.activeTabId !== null
/** An open note whose text is available (a locked note's isn't). */
const hasOpenText = (s: AppState) => {
  const n = editingNote(s)
  return !!n && !n.locked
}
const st = (ctx: CommandContext) => ctx.store.getState()
/** The active tab: for commands about tabs themselves. */
const activeId = (ctx: CommandContext) => st(ctx).session.activeTabId
/** The note being worked in (the side note while it has the cursor): for note commands. */
const noteId = (ctx: CommandContext) => editingNote(st(ctx))?.id ?? null

const gotoTabs: Command[] = Array.from({ length: 9 }, (_, i) => ({
  id: `tab.goto${i + 1}`,
  title: `Go to tab ${i + 1}`,
  section: 'Tabs' as const,
  shortcuts: [{ code: `Digit${i + 1}`, mod2: true }],
  palette: false,
  run: (ctx: CommandContext) => st(ctx).goToTab(i + 1),
}))

export const COMMANDS: Command[] = [
  {
    id: 'palette.open',
    title: 'Command palette',
    section: 'App',
    shortcuts: [{ code: 'KeyK', mod: true }],
    palette: false,
    run: (ctx) => st(ctx).setUi({ paletteOpen: !st(ctx).ui.paletteOpen, paletteMode: 'commands' }),
  },
  {
    id: 'note.new',
    title: 'New note',
    section: 'Note',
    keywords: ['create', 'add', 'tab'],
    shortcuts: [
      { code: 'KeyN', mod2: true },
      { code: 'KeyT', mod: true, standaloneOnly: true },
    ],
    run: (ctx) => void st(ctx).newNote(),
  },
  {
    id: 'tab.close',
    title: 'Close tab',
    section: 'Tabs',
    shortcuts: [
      { code: 'KeyW', mod2: true },
      { code: 'KeyW', mod: true, standaloneOnly: true },
    ],
    when: hasActive,
    run: (ctx) => {
      const id = activeId(ctx)
      if (!id) return
      if (st(ctx).notes[id]?.pinned) st(ctx).setUi({ unpinPromptId: id })
      else st(ctx).closeTab(id)
    },
  },
  {
    id: 'tab.reopen',
    title: 'Reopen closed tab',
    section: 'Tabs',
    keywords: ['undo close'],
    shortcuts: [{ code: 'KeyT', mod2: true, shift: true }],
    when: (s) => s.session.closedStack.length > 0,
    run: (ctx) => st(ctx).reopenClosedTab(),
  },
  {
    id: 'tab.next',
    title: 'Next tab',
    section: 'Tabs',
    shortcuts: [
      { code: 'BracketRight', mod2: true },
      { code: 'PageDown', mod: true },
    ],
    when: (s) => s.session.openTabIds.length > 1,
    run: (ctx) => st(ctx).nextTab(1),
  },
  {
    id: 'tab.prev',
    title: 'Previous tab',
    section: 'Tabs',
    shortcuts: [
      { code: 'BracketLeft', mod2: true },
      { code: 'PageUp', mod: true },
    ],
    when: (s) => s.session.openTabIds.length > 1,
    run: (ctx) => st(ctx).nextTab(-1),
  },
  ...gotoTabs,
  {
    id: 'tab.rename',
    title: 'Rename note',
    section: 'Note',
    keywords: ['title'],
    shortcuts: [{ code: 'F2' }],
    when: hasActive,
    run: (ctx) => st(ctx).setUi({ renamingId: activeId(ctx), paletteOpen: false }),
  },
  {
    id: 'note.pin',
    title: 'Pin / unpin note',
    section: 'Note',
    shortcuts: [],
    when: hasActive,
    run: (ctx) => {
      const id = noteId(ctx)
      if (id) st(ctx).togglePin(id)
    },
  },
  {
    id: 'note.duplicate',
    title: 'Duplicate note',
    section: 'Note',
    keywords: ['copy'],
    shortcuts: [],
    when: hasOpenText,
    run: (ctx) => {
      const id = noteId(ctx)
      if (id) st(ctx).duplicateNote(id)
    },
  },
  {
    id: 'note.trash',
    title: 'Move note to Trash',
    section: 'Note',
    keywords: ['delete', 'remove'],
    shortcuts: [],
    when: hasActive,
    run: (ctx) => {
      const id = noteId(ctx)
      if (id) trashWithUndo(id)
    },
  },
  {
    id: 'note.share',
    title: 'Share note…',
    section: 'Note',
    keywords: ['link', 'send', 'password', 'expire'],
    shortcuts: [],
    when: hasOpenText,
    run: (ctx) => {
      const id = noteId(ctx)
      if (id) shareStore.getState().open(id)
      st(ctx).setUi({ paletteOpen: false })
    },
  },
  {
    id: 'voice.toggle',
    title: 'Voice typing',
    section: 'Note',
    keywords: ['dictate', 'dictation', 'speech', 'microphone', 'mic'],
    shortcuts: [],
    only: 'laptop',
    when: (s) => hasOpenText(s) && isVoiceSupported(),
    run: (ctx) => {
      st(ctx).setUi({ paletteOpen: false })
      toggleVoice(getActiveView())
    },
  },
  {
    id: 'note.compare',
    title: 'Compare with another note…',
    section: 'Note',
    keywords: ['diff', 'difference', 'changes', 'side by side'],
    shortcuts: [],
    when: hasOpenText,
    run: (ctx) => {
      const s = st(ctx)
      const id = editingNote(s)?.id ?? null
      s.setUi({ paletteOpen: false })
      if (id) compareStore.getState().open(id)
    },
  },
  {
    id: 'edit.symbol',
    title: 'Insert symbol or emoji…',
    section: 'Note',
    keywords: ['emoji', 'character', 'arrow', 'special', 'unicode', 'euro', 'check'],
    shortcuts: [],
    when: hasOpenText,
    run: (ctx) => {
      st(ctx).setUi({ paletteOpen: false })
      symbolStore.getState().setOpen(true)
    },
  },
  {
    id: 'note.readability',
    title: 'Readability…',
    section: 'Note',
    keywords: ['grade', 'reading', 'level', 'sentences', 'words', 'style', 'clarity'],
    shortcuts: [],
    when: hasOpenText,
    run: (ctx) => {
      const id = noteId(ctx)
      st(ctx).setUi({ paletteOpen: false })
      if (id) readabilityStore.getState().open(id)
    },
  },
  {
    id: 'note.goal',
    title: 'Set word goal…',
    section: 'Note',
    keywords: ['target', 'count', 'writing'],
    shortcuts: [],
    when: hasOpenText,
    run: (ctx) => {
      const id = noteId(ctx)
      if (id) goalStore.getState().open(id)
      st(ctx).setUi({ paletteOpen: false })
    },
  },
  {
    id: 'note.lock',
    title: 'Lock with password…',
    section: 'Note',
    keywords: ['encrypt', 'private', 'secure', 'secret'],
    shortcuts: [],
    when: hasOpenText,
    run: (ctx) => {
      const id = noteId(ctx)
      if (id) lockStore.getState().open(id)
      st(ctx).setUi({ paletteOpen: false })
    },
  },
  {
    id: 'note.tags',
    title: 'Tags…',
    section: 'Note',
    keywords: ['label', 'folder'],
    shortcuts: [],
    when: hasActive,
    run: (ctx) => {
      const id = noteId(ctx)
      if (id) tagsStore.getState().open(id)
      st(ctx).setUi({ paletteOpen: false })
    },
  },
  {
    id: 'note.print',
    title: 'Print / save as PDF…',
    section: 'Note',
    keywords: ['pdf', 'paper', 'export'],
    shortcuts: [{ code: 'KeyP', mod: true }],
    when: hasOpenText,
    run: (ctx) => {
      const id = noteId(ctx)
      if (id) printStore.getState().open(id)
      st(ctx).setUi({ paletteOpen: false })
    },
  },
  {
    id: 'note.history',
    title: 'Version history…',
    section: 'Note',
    keywords: ['versions', 'restore', 'undo', 'earlier', 'backup', 'snapshot'],
    shortcuts: [],
    when: hasOpenText,
    run: (ctx) => {
      const id = noteId(ctx)
      if (id) historyStore.getState().open(id)
      st(ctx).setUi({ paletteOpen: false })
    },
  },

  {
    id: 'note.format',
    title: 'Change format…',
    section: 'Note',
    keywords: ['language', 'syntax', 'highlight', 'mode', 'markdown', 'json'],
    shortcuts: [],
    when: hasActive,
    run: (ctx) => st(ctx).setUi({ paletteOpen: true, paletteMode: 'formats' }),
  },
  {
    id: 'view.preview.cycle',
    title: 'Markdown: edit / split / preview',
    phoneTitle: 'Markdown: edit / preview', // phones have no split view
    section: 'View',
    keywords: ['markdown', 'render', 'preview'],
    shortcuts: [{ code: 'KeyP', mod2: true }],
    when: (s) => {
      const id = editingNote(s)?.id ?? null
      return id !== null && s.notes[id]?.mode === 'markdown'
    },
    run: (ctx) => {
      const id = noteId(ctx)
      if (!id) return
      // Phones toggle edit ⇄ preview in phone-only state; the laptop's view is left alone.
      if (isPhoneNow()) {
        const phone = phoneStore.getState()
        const shown = phoneViewFor(phone.previewByTab, id, st(ctx).session.perTab[id]?.previewMode)
        phone.setPreview(id, shown !== 'preview')
      } else st(ctx).cyclePreview(id)
    },
  },
  {
    id: 'view.wrap',
    title: 'Toggle word wrap',
    section: 'View',
    shortcuts: [],
    when: hasActive,
    run: (ctx) => {
      const id = noteId(ctx)
      if (id) st(ctx).toggleWrap(id)
    },
  },
  {
    id: 'view.split.open',
    title: 'Open another note side by side',
    section: 'View',
    keywords: ['split', 'two', 'compare', 'beside'],
    shortcuts: [],
    only: 'laptop',
    when: (s) => s.session.openTabIds.length > 1,
    run: (ctx) => {
      const { openTabIds, activeTabId } = st(ctx).session
      const i = openTabIds.indexOf(activeTabId ?? '')
      const other = openTabIds[i - 1] ?? openTabIds[i + 1]
      if (other) st(ctx).setSplitNote(other)
    },
  },
  {
    id: 'view.split.close',
    title: 'Close side-by-side note',
    section: 'View',
    keywords: ['split', 'two', 'beside'],
    shortcuts: [],
    only: 'laptop',
    when: (s) => !!s.session.splitNoteId,
    run: (ctx) => st(ctx).setSplitNote(null),
  },
  {
    id: 'view.spellcheck',
    title: 'Toggle spell check',
    section: 'View',
    keywords: ['spelling', 'typos', 'proofread'],
    shortcuts: [],
    run: (ctx) => st(ctx).toggleSpellcheck(),
  },
  {
    id: 'view.outline',
    title: 'Toggle outline',
    section: 'View',
    keywords: ['headings', 'contents', 'table of contents', 'jump', 'navigate'],
    shortcuts: [{ code: 'KeyO', mod2: true }],
    only: 'laptop',
    run: (ctx) => st(ctx).updateSettings({ showOutline: !st(ctx).settings.showOutline }),
  },
  {
    id: 'view.typewriter',
    title: 'Toggle typewriter mode',
    section: 'View',
    keywords: ['center', 'centre', 'scroll', 'writing'],
    shortcuts: [],
    run: (ctx) => st(ctx).updateSettings({ typewriter: !st(ctx).settings.typewriter }),
  },
  {
    id: 'view.focusMode',
    title: 'Toggle focus mode',
    section: 'View',
    keywords: ['dim', 'paragraph', 'writing', 'concentrate'],
    shortcuts: [],
    run: (ctx) => st(ctx).updateSettings({ focusMode: !st(ctx).settings.focusMode }),
  },
  {
    id: 'view.liveMarkdown',
    title: 'Toggle live Markdown',
    section: 'View',
    keywords: ['format as you type', 'rich text', 'wysiwyg', 'preview'],
    shortcuts: [],
    run: (ctx) => st(ctx).updateSettings({ liveMarkdown: !st(ctx).settings.liveMarkdown }),
  },
  {
    id: 'view.toolbar',
    title: 'Toggle toolbar',
    section: 'View',
    keywords: ['format', 'bold', 'buttons'],
    shortcuts: [],
    run: (ctx) => st(ctx).updateSettings({ showToolbar: !st(ctx).settings.showToolbar }),
  },
  {
    id: 'view.sidebar',
    title: 'Toggle sidebar',
    section: 'View',
    keywords: ['notes', 'panel'],
    shortcuts: [{ code: 'KeyB', mod: true, yieldsToMarkdown: true }],
    only: 'laptop',
    run: (ctx) => st(ctx).toggleSidebar(),
  },
  {
    id: 'library.open',
    title: 'Open Library',
    section: 'View',
    keywords: ['notes', 'search', 'trash', 'sidebar'],
    shortcuts: [],
    only: 'phone',
    run: (ctx) => {
      st(ctx).setUi({ paletteOpen: false })
      phoneStore.getState().open('library')
    },
  },
  {
    id: 'view.search',
    title: 'Search all notes',
    section: 'View',
    keywords: ['find'],
    shortcuts: [{ code: 'KeyF', mod: true, shift: true }],
    run: (ctx) => {
      st(ctx).setUi({ paletteOpen: false, focusSearch: st(ctx).ui.focusSearch + 1 })
      // Zen hides the sidebar: leave it, or nothing would show.
      if (st(ctx).session.zen) st(ctx).toggleZen()
      // Phones have no sidebar: open the Library's search instead.
      if (isPhoneNow()) return openLibrary('search')
      st(ctx).setSidebar({ open: true, panel: 'search' })
    },
  },
  {
    id: 'view.trash',
    title: 'Show Trash',
    section: 'View',
    keywords: ['deleted', 'restore'],
    shortcuts: [],
    run: (ctx) => {
      if (isPhoneNow()) {
        st(ctx).setUi({ paletteOpen: false })
        return openLibrary('trash')
      }
      if (st(ctx).session.zen) st(ctx).toggleZen()
      st(ctx).setSidebar({ open: true, panel: 'trash' })
    },
  },
  {
    id: 'view.zen',
    title: 'Toggle zen mode',
    section: 'View',
    keywords: ['focus', 'distraction', 'fullscreen'],
    // Alt+Z too: Safari and some Mac setups keep ⌘. for themselves.
    shortcuts: [
      { code: 'Period', mod: true },
      { code: 'KeyZ', mod2: true },
    ],
    run: (ctx) => st(ctx).toggleZen(),
  },
  {
    id: 'view.theme',
    title: 'Switch theme (system → light → dark)',
    section: 'View',
    keywords: ['dark', 'light', 'appearance'],
    shortcuts: [],
    run: (ctx) => st(ctx).updateSettings({ theme: nextThemePref(st(ctx).settings.theme) }),
  },
  {
    id: 'note.export',
    title: 'Save note as file…',
    section: 'Note',
    keywords: ['download', 'export', 'save as'],
    // Otherwise the browser's own "Save page" answers the key.
    shortcuts: [{ code: 'KeyS', mod: true }],
    when: hasOpenText,
    run: (ctx) => {
      const id = noteId(ctx)
      if (id) void saveNoteAsFile(id)
    },
  },
  {
    id: 'data.exportHtml',
    title: 'Export as web page (.html)',
    section: 'Data',
    keywords: ['download', 'html', 'save'],
    shortcuts: [],
    when: hasOpenText,
    run: (ctx) => {
      const id = noteId(ctx)
      if (id) void exportNoteAs(id, 'html')
    },
  },
  {
    id: 'data.exportDocx',
    title: 'Export as Word (.docx)',
    section: 'Data',
    keywords: ['download', 'word', 'docx', 'document', 'save'],
    shortcuts: [],
    when: hasOpenText,
    run: (ctx) => {
      const id = noteId(ctx)
      if (id) void exportNoteAs(id, 'docx')
    },
  },

  {
    id: 'data.export',
    title: 'Export all notes (backup)',
    section: 'Data',
    keywords: ['backup', 'download', 'save'],
    shortcuts: [],
    run: () => void exportAll(),
  },
  {
    id: 'data.zip',
    title: 'Download all notes as files (.zip)',
    section: 'Data',
    keywords: ['export', 'zip', 'markdown', 'files', 'download', 'take out'],
    shortcuts: [],
    run: (ctx) => {
      st(ctx).setUi({ paletteOpen: false })
      void import('../features/export/notesZip').then((m) => m.downloadAllAsFiles())
    },
  },
  {
    id: 'data.import',
    title: 'Import backup or files…',
    section: 'Data',
    keywords: ['restore', 'open', 'upload'],
    shortcuts: [],
    run: () => pickFilesToImport(),
  },
  {
    id: 'app.settings',
    title: 'Settings',
    section: 'App',
    keywords: ['preferences', 'font', 'size'],
    // ⌘, is often kept by the browser for its own settings; ⌃⌥, (Alt+,) always reaches us.
    shortcuts: [
      { code: 'Comma', mod: true },
      { code: 'Comma', mod2: true },
    ],
    run: (ctx) => st(ctx).setUi({ settingsOpen: true, paletteOpen: false }),
  },
  {
    id: 'app.shortcuts',
    title: 'Keyboard shortcuts',
    section: 'App',
    keywords: ['keys', 'help'],
    shortcuts: [{ code: 'Slash', mod: true, yieldsToCode: true }],
    run: (ctx) => st(ctx).setUi({ shortcutsOpen: true, paletteOpen: false }),
  },
  {
    id: 'help.sample',
    title: 'Open sample note',
    section: 'App',
    keywords: ['demo', 'example', 'tour', 'help', 'markdown'],
    shortcuts: [],
    run: (ctx) => {
      openSample(ctx.store)
      st(ctx).setUi({ paletteOpen: false })
    },
  },
  {
    id: 'app.about',
    title: 'About Blankleaf',
    section: 'App',
    keywords: ['version', 'help', 'privacy', 'github', 'feedback', 'bug'],
    shortcuts: [],
    run: (ctx) => st(ctx).setUi({ aboutOpen: true, paletteOpen: false }),
  },
  {
    id: 'app.whatsNew',
    title: 'What’s new',
    section: 'App',
    keywords: ['changelog', 'release', 'version', 'update'],
    shortcuts: [],
    run: (ctx) => st(ctx).setUi({ whatsNewOpen: true, paletteOpen: false }),
  },
  ...TEMPLATES.map((t): Command => ({
    id: `note.template.${t.id}`,
    title: `New from template: ${t.label}`,
    section: 'Note',
    keywords: ['template', 'journal', 'meeting', 'checklist', 'todo'],
    shortcuts: [],
    run: (ctx) => void newFromTemplate(ctx.store, t.id),
  })),
  // Text and dev tools (also in the toolbar's Transform menu).
  {
    id: 'text.formatCode',
    title: 'Format code',
    section: 'Note',
    keywords: [
      'prettier',
      'beautify',
      'tidy',
      'indent',
      'pretty',
      'sql',
      'javascript',
      'css',
      'html',
    ],
    // As in VS Code (Shift+Option+F on a Mac is Shift+Ctrl+Option+F here).
    shortcuts: [{ code: 'KeyF', mod2: true, shift: true }],
    when: (s) => {
      const n = editingNote(s)
      return !!n && !n.locked && canFormat(n.language)
    },
    run: (ctx) => {
      const n = editingNote(st(ctx))
      const view = getActiveView()
      st(ctx).setUi({ paletteOpen: false })
      if (n && view) void runFormatCode(view, n.language)
    },
  },
  ...TRANSFORM_IDS.map((id): Command => ({
    id: `text.${id}`,
    title: TRANSFORMS[id].label,
    section: 'Note',
    keywords: ['transform', 'convert', 'encode', 'decode', 'json', 'yaml', 'base64', 'url'],
    shortcuts: [],
    when: hasActive,
    run: () => {
      const view = getActiveView()
      if (view) void runTransform(view, id)
    },
  })),
]

/** Phones: show a Library section (the laptop sidebar isn't on screen). */
function openLibrary(section: 'search' | 'trash') {
  const p = phoneStore.getState()
  p.setLibrarySection(section)
  p.open('library')
}

const isPhoneNow = () =>
  typeof window.matchMedia === 'function' && window.matchMedia(PHONE_QUERY).matches

/** The command's palette title for the current layout. */
export function commandTitle(c: Command): string {
  return c.phoneTitle && isPhoneNow() ? c.phoneTitle : c.title
}

export function commandEnabled(c: Command, s: AppState): boolean {
  if (c.only && (c.only === 'phone') !== isPhoneNow()) return false
  return c.when ? c.when(s) : true
}
