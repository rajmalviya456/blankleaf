/**
 * Single app store: notes, the current window's session, settings and UI flags.
 *
 * Deletion contract for the persistence layer (Task 8): the store never calls the DB.
 * Persistence diffs `notes` between states. A note that disappears was either
 *  - trashed before (deletedAt set)  → purge it and write a tombstone, or
 *  - never trashed (empty untitled tab closed) → hard delete, no tombstone.
 */
import { createStore, useStore, type StoreApi } from 'zustand'
import { CLOSED_STACK_MAX, DEFAULT_SETTINGS, emptySession, newNoteDraft } from '../domain/defaults'
import { languageMeta } from '../domain/languages'
import { displayTitle } from '../domain/title'
import type { LanguageId, Note, NoteMode, Session, Settings, TabViewState } from '../domain/types'

export type SaveStatus = 'saved' | 'saving' | 'error'

export interface UiState {
  saveStatus: SaveStatus
  saveError: string | null
  paletteOpen: boolean
  settingsOpen: boolean
  renamingId: string | null
  /** Ask the editor of `noteId` to select [from, to) and scroll to it (nonce makes repeats fire). */
  reveal: { noteId: string; from: number; to: number; nonce: number } | null
  paletteMode: 'commands' | 'formats'
  shortcutsOpen: boolean
  aboutOpen: boolean
  whatsNewOpen: boolean
  /** Pinned tab whose close was requested; the tab bar asks to unpin it. */
  unpinPromptId: string | null
  /** Bumped to ask the search box to take focus. */
  focusSearch: number
  /** The tag the notes list is filtered by, if any. */
  tagFilter: string | null
}

export interface AppState {
  notes: Record<string, Note>
  session: Session
  settings: Settings
  ui: UiState
}

export interface AppActions {
  newNote(partial?: Partial<Note>): string
  openNote(id: string): void
  setActive(id: string): void
  closeTab(id: string): void
  closeOthers(id: string): void
  closeToRight(id: string): void
  reopenClosedTab(): void
  moveTab(fromIndex: number, toIndex: number): void
  nextTab(dir: 1 | -1): void
  goToTab(n: number): void
  renameNote(id: string, title: string): void
  togglePin(id: string): void
  duplicateNote(id: string): string
  updateContent(id: string, content: string): void
  setNoteMode(id: string, mode: NoteMode): void
  setLanguage(id: string, lang: LanguageId): void
  toggleWrap(id: string): void
  toggleSpellcheck(id: string): void
  setNoteTags(id: string, tags: string[]): void
  trashNote(id: string): void
  restoreNote(id: string): void
  purgeNote(id: string): void
  emptyTrash(): void
  setViewState(id: string, vs: Partial<TabViewState>): void
  setSidebar(p: Partial<Session['sidebar']>): void
  toggleSidebar(): void
  toggleZen(): void
  updateSettings(p: Partial<Settings>): void
  setSaveStatus(s: SaveStatus, err?: string | null): void
  setUi(p: Partial<UiState>): void
  applyRemoteNote(note: Note): void
  reveal(noteId: string, from: number, to: number): void
  /** Another window deleted this note permanently. */
  removeRemoteNote(id: string): void
  /** Merge notes from an import. Existing notes keep their local rev; nothing is opened. */
  importNotes(notes: Note[]): void
  /** Markdown notes: edit → split → preview → edit. */
  cyclePreview(id: string): void
}

export type AppStore = AppState & AppActions

export const DEFAULT_VIEW_STATE: TabViewState = {
  anchor: 0,
  head: 0,
  scrollTop: 0,
  previewMode: 'edit',
}

const initialUi = (): UiState => ({
  saveStatus: 'saved',
  saveError: null,
  paletteOpen: false,
  settingsOpen: false,
  renamingId: null,
  reveal: null,
  paletteMode: 'commands',
  shortcutsOpen: false,
  aboutOpen: false,
  whatsNewOpen: false,
  unpinPromptId: null,
  focusSearch: 0,
  tagFilter: null,
})

/** Keep pinned tabs first, preserving relative order inside each group. */
function normalizeTabs(ids: string[], notes: Record<string, Note>): string[] {
  const pinned = ids.filter((id) => notes[id]?.pinned)
  const rest = ids.filter((id) => notes[id] && !notes[id].pinned)
  return [...pinned, ...rest]
}

function isBlank(note: Note): boolean {
  return note.title === null && note.content.trim() === ''
}

/** Insert `id` right after the active tab (or at the end), then normalize. */
function insertTab(session: Session, id: string, notes: Record<string, Note>): string[] {
  const ids = session.openTabIds.filter((x) => x !== id)
  const activeIdx = session.activeTabId ? ids.indexOf(session.activeTabId) : -1
  ids.splice(activeIdx >= 0 ? activeIdx + 1 : ids.length, 0, id)
  return normalizeTabs(ids, notes)
}

export function createAppStore(
  initial?: Partial<AppState>,
  now: () => number = Date.now,
): StoreApi<AppStore> {
  return createStore<AppStore>()((set, get) => {
    const patchNote = (id: string, patch: Partial<Note>, bump = true) => {
      const note = get().notes[id]
      if (!note) return
      set({
        notes: { ...get().notes, [id]: { ...note, ...patch, ...(bump && { updatedAt: now() }) } },
      })
    }

    /** Remove a tab from the session; returns the new session (does not touch notes). */
    const withoutTab = (session: Session, id: string): Session => {
      const idx = session.openTabIds.indexOf(id)
      if (idx < 0) return session
      const openTabIds = session.openTabIds.filter((x) => x !== id)
      let activeTabId = session.activeTabId
      if (activeTabId === id) activeTabId = openTabIds[idx] ?? openTabIds[idx - 1] ?? null
      const { [id]: _drop, ...perTab } = session.perTab
      return { ...session, openTabIds, activeTabId, perTab }
    }

    const closeOne = (id: string) => {
      const { notes, session } = get()
      const note = notes[id]
      if (!note || note.pinned || !session.openTabIds.includes(id)) return
      const next = withoutTab(session, id)
      if (isBlank(note)) {
        const { [id]: _gone, ...rest } = notes
        set({ notes: rest, session: next })
        return
      }
      const closedStack = [...next.closedStack.filter((x) => x !== id), id].slice(-CLOSED_STACK_MAX)
      set({ session: { ...next, closedStack } })
    }

    const openExisting = (id: string) => {
      const { notes, session } = get()
      const note = notes[id]
      if (!note || note.deletedAt !== null) return
      const openTabIds = session.openTabIds.includes(id)
        ? session.openTabIds
        : insertTab(session, id, notes)
      set({ session: { ...session, openTabIds, activeTabId: id } })
    }

    return {
      notes: {},
      session: emptySession(),
      settings: { ...DEFAULT_SETTINGS },
      ...initial,
      ui: { ...initialUi(), ...initial?.ui },

      newNote(partial) {
        const draft: Note = { ...newNoteDraft(now(), get().settings), ...partial }
        const notes = { ...get().notes, [draft.id]: draft }
        const session = get().session
        set({
          notes,
          session: {
            ...session,
            openTabIds: insertTab(session, draft.id, notes),
            activeTabId: draft.id,
          },
        })
        return draft.id
      },

      openNote: openExisting,

      setActive(id) {
        const session = get().session
        if (session.openTabIds.includes(id)) set({ session: { ...session, activeTabId: id } })
      },

      closeTab: closeOne,

      closeOthers(id) {
        get()
          .session.openTabIds.filter((x) => x !== id)
          .forEach(closeOne)
        get().setActive(id)
      },

      closeToRight(id) {
        const ids = get().session.openTabIds
        const idx = ids.indexOf(id)
        if (idx < 0) return
        ids.slice(idx + 1).forEach(closeOne)
        if (!get().session.activeTabId) get().setActive(id)
      },

      reopenClosedTab() {
        const stack = [...get().session.closedStack]
        while (stack.length) {
          const id = stack.pop()!
          const note = get().notes[id]
          if (note && note.deletedAt === null && !get().session.openTabIds.includes(id)) {
            set({ session: { ...get().session, closedStack: stack } })
            openExisting(id)
            return
          }
        }
        set({ session: { ...get().session, closedStack: [] } })
      },

      moveTab(fromIndex, toIndex) {
        const { session, notes } = get()
        const ids = [...session.openTabIds]
        const id = ids[fromIndex]
        if (!id) return
        const pinnedCount = ids.filter((x) => notes[x]?.pinned).length
        const [lo, hi] = notes[id].pinned ? [0, pinnedCount - 1] : [pinnedCount, ids.length - 1]
        const target = Math.min(Math.max(toIndex, lo), hi)
        ids.splice(fromIndex, 1)
        ids.splice(target, 0, id)
        set({ session: { ...session, openTabIds: ids } })
      },

      nextTab(dir) {
        const { openTabIds, activeTabId } = get().session
        if (!openTabIds.length) return
        const idx = activeTabId ? openTabIds.indexOf(activeTabId) : 0
        const next = (idx + dir + openTabIds.length) % openTabIds.length
        get().setActive(openTabIds[next])
      },

      goToTab(n) {
        const ids = get().session.openTabIds
        if (!ids.length) return
        get().setActive(ids[Math.min(Math.max(n, 1), ids.length) - 1])
      },

      renameNote(id, title) {
        const trimmed = title.trim()
        patchNote(id, { title: trimmed || null })
      },

      togglePin(id) {
        const note = get().notes[id]
        if (!note || note.deletedAt !== null) return
        patchNote(id, { pinned: !note.pinned })
        const { notes, session } = get()
        const openTabIds = session.openTabIds.includes(id)
          ? normalizeTabs(session.openTabIds, notes)
          : insertTab(session, id, notes)
        set({ session: { ...session, openTabIds } })
      },

      duplicateNote(id) {
        const src = get().notes[id]
        if (!src) return id
        get().setActive(id)
        return get().newNote({
          content: src.content,
          mode: src.mode,
          language: src.language,
          wrap: src.wrap,
          spellcheck: src.spellcheck,
          tags: src.tags,
          title: `${displayTitle(src)} (copy)`,
        })
      },

      updateContent(id, content) {
        if (get().notes[id]?.content === content) return
        patchNote(id, { content })
      },

      setNoteMode: (id, mode) => patchNote(id, { mode }),
      setLanguage(id, language) {
        const note = get().notes[id]
        if (!note) return
        if (language === 'auto') return patchNote(id, { language })
        const patch: Partial<Note> = {
          language,
          mode: language === 'markdown' ? 'markdown' : 'plain',
        }
        if (!get().session.perTab[id]?.wrapTouched)
          patch.wrap = languageMeta(language).kind === 'text'
        patchNote(id, patch)
      },
      toggleWrap(id) {
        const note = get().notes[id]
        if (!note) return
        patchNote(id, { wrap: !note.wrap })
        get().setViewState(id, { wrapTouched: true })
      },
      setNoteTags(id, tags) {
        if (get().notes[id]) patchNote(id, { tags: tags.length ? tags : undefined })
      },
      toggleSpellcheck(id) {
        const note = get().notes[id]
        if (note) patchNote(id, { spellcheck: !note.spellcheck })
      },

      trashNote(id) {
        if (!get().notes[id]) return
        patchNote(id, { deletedAt: now(), pinned: false })
        const session = withoutTab(get().session, id)
        set({
          session: { ...session, closedStack: session.closedStack.filter((x) => x !== id) },
        })
      },

      restoreNote(id) {
        if (get().notes[id]?.deletedAt != null) patchNote(id, { deletedAt: null })
      },

      purgeNote(id) {
        const notes = get().notes
        if (notes[id]?.deletedAt == null) return
        const { [id]: _gone, ...rest } = notes
        set({ notes: rest })
      },

      emptyTrash() {
        const notes = Object.fromEntries(
          Object.entries(get().notes).filter(([, n]) => n.deletedAt === null),
        )
        set({ notes })
      },

      setViewState(id, vs) {
        const session = get().session
        const current = session.perTab[id] ?? DEFAULT_VIEW_STATE
        set({ session: { ...session, perTab: { ...session.perTab, [id]: { ...current, ...vs } } } })
      },

      setSidebar(p) {
        const session = get().session
        set({ session: { ...session, sidebar: { ...session.sidebar, ...p } } })
      },

      toggleSidebar() {
        get().setSidebar({ open: !get().session.sidebar.open })
      },

      toggleZen() {
        const session = get().session
        set({ session: { ...session, zen: !session.zen } })
      },

      updateSettings(p) {
        set({ settings: { ...get().settings, ...p } })
      },

      setSaveStatus(saveStatus, err = null) {
        set({ ui: { ...get().ui, saveStatus, saveError: err } })
      },

      setUi(p) {
        set({ ui: { ...get().ui, ...p } })
      },

      importNotes(incoming) {
        if (!incoming.length) return
        const notes = { ...get().notes }
        for (const n of incoming) {
          const current = notes[n.id]
          notes[n.id] = { ...n, pinned: false, rev: current ? current.rev : 0 }
        }
        set({ notes })
      },

      cyclePreview(id) {
        if (get().notes[id]?.mode !== 'markdown') return
        const order = ['edit', 'split', 'preview'] as const
        const current = get().session.perTab[id]?.previewMode ?? 'edit'
        get().setViewState(id, { previewMode: order[(order.indexOf(current) + 1) % order.length] })
      },

      removeRemoteNote(id) {
        if (!get().notes[id]) return
        const { [id]: _gone, ...rest } = get().notes
        const session = withoutTab(get().session, id)
        set({
          notes: rest,
          session: { ...session, closedStack: session.closedStack.filter((x) => x !== id) },
        })
      },

      reveal(noteId, from, to) {
        const nonce = (get().ui.reveal?.nonce ?? 0) + 1
        set({ ui: { ...get().ui, reveal: { noteId, from, to, nonce } } })
        get().setViewState(noteId, { anchor: from, head: to })
      },

      applyRemoteNote(note) {
        const notes = { ...get().notes, [note.id]: note }
        let session = get().session
        if (note.deletedAt !== null) session = withoutTab(session, note.id)
        set({
          notes,
          session: { ...session, openTabIds: normalizeTabs(session.openTabIds, notes) },
        })
      },
    }
  })
}

// --- Singleton binding for React ------------------------------------------------

let appStore: StoreApi<AppStore> | null = null

export function initStore(store: StoreApi<AppStore>): StoreApi<AppStore> {
  appStore = store
  return store
}

export function getStore(): StoreApi<AppStore> {
  if (!appStore) appStore = createAppStore()
  return appStore
}

export function useAppStore<T>(selector: (s: AppStore) => T): T {
  return useStore(getStore(), selector)
}
