/**
 * Every user action, defined once. The command palette, global shortcuts, the shortcuts
 * sheet and menus all read from here.
 */
import type { StoreApi } from 'zustand'
import { exportAll, exportNote, pickFilesToImport } from '../features/backup/actions'
import { shareStore } from '../features/share/shareStore'
import { historyStore } from '../features/history/historyStore'
import { nextThemePref } from '../lib/theme'
import { PHONE_QUERY } from '../lib/media'
import { phoneStore } from '../features/phone/phoneStore'
import { phoneViewFor } from '../features/phone/phoneView'
import { getActiveView } from '../features/editor/activeView'
import { runTransform, TRANSFORM_IDS, TRANSFORMS } from '../features/toolbar/transforms'
import type { Shortcut } from '../lib/shortcuts'
import type { AppState, AppStore } from '../store/store'

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
const st = (ctx: CommandContext) => ctx.store.getState()
const activeId = (ctx: CommandContext) => st(ctx).session.activeTabId

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
      const id = activeId(ctx)
      if (id) st(ctx).togglePin(id)
    },
  },
  {
    id: 'note.duplicate',
    title: 'Duplicate note',
    section: 'Note',
    keywords: ['copy'],
    shortcuts: [],
    when: hasActive,
    run: (ctx) => {
      const id = activeId(ctx)
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
      const id = activeId(ctx)
      if (id) st(ctx).trashNote(id)
    },
  },
  {
    id: 'note.share',
    title: 'Share note…',
    section: 'Note',
    keywords: ['link', 'send', 'password', 'expire'],
    shortcuts: [],
    when: hasActive,
    run: (ctx) => {
      const id = activeId(ctx)
      if (id) shareStore.getState().open(id)
      st(ctx).setUi({ paletteOpen: false })
    },
  },
  {
    id: 'note.history',
    title: 'Version history…',
    section: 'Note',
    keywords: ['versions', 'restore', 'undo', 'earlier', 'backup', 'snapshot'],
    shortcuts: [],
    when: hasActive,
    run: (ctx) => {
      const id = activeId(ctx)
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
      const id = s.session.activeTabId
      return id !== null && s.notes[id]?.mode === 'markdown'
    },
    run: (ctx) => {
      const id = activeId(ctx)
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
      const id = activeId(ctx)
      if (id) st(ctx).toggleWrap(id)
    },
  },
  {
    id: 'view.spellcheck',
    title: 'Toggle spell check',
    section: 'View',
    keywords: ['spelling', 'typos', 'proofread'],
    shortcuts: [],
    when: hasActive,
    run: (ctx) => {
      const id = activeId(ctx)
      if (id) st(ctx).toggleSpellcheck(id)
    },
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
    shortcuts: [{ code: 'KeyB', mod: true }],
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
      st(ctx).setSidebar({ open: true, panel: 'trash' })
    },
  },
  {
    id: 'view.zen',
    title: 'Toggle zen mode',
    section: 'View',
    keywords: ['focus', 'distraction', 'fullscreen'],
    shortcuts: [{ code: 'Period', mod: true }],
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
    title: 'Export note as file',
    section: 'Data',
    keywords: ['download', 'save as'],
    shortcuts: [],
    when: hasActive,
    run: (ctx) => {
      const id = activeId(ctx)
      if (id) exportNote(id)
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
    shortcuts: [{ code: 'Slash', mod: true }],
    run: (ctx) => st(ctx).setUi({ shortcutsOpen: true, paletteOpen: false }),
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
  // Text and dev tools (also in the toolbar's Transform menu).
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
