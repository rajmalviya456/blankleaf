import { CLOSED_STACK_MAX } from '../domain/defaults'
import { activeNote, liveNotesSorted, orderedTabs, trashedNotes } from './selectors'
import { createAppStore } from './store'

function setup() {
  let t = 1000
  const store = createAppStore(undefined, () => ++t)
  return { store, s: () => store.getState() }
}

/** Create a tab with content so closing it keeps the note. */
function filled(store: ReturnType<typeof createAppStore>, content = 'text') {
  const id = store.getState().newNote()
  store.getState().updateContent(id, content)
  return id
}

describe('app store: tabs', () => {
  it('newNote opens and activates a tab right of the active one', () => {
    const { store, s } = setup()
    const a = filled(store, 'a')
    const b = filled(store, 'b')
    s().setActive(a)
    const c = s().newNote()
    expect(s().session.openTabIds).toEqual([a, c, b])
    expect(s().session.activeTabId).toBe(c)
  })

  it('closeTab on empty untitled note removes the note entirely', () => {
    const { s } = setup()
    const id = s().newNote()
    s().closeTab(id)
    expect(s().notes[id]).toBeUndefined()
    expect(s().session.openTabIds).toEqual([])
    expect(s().session.closedStack).toEqual([])
  })

  it('closeTab on non-empty note keeps note, removes tab, pushes closedStack', () => {
    const { store, s } = setup()
    const id = filled(store)
    s().closeTab(id)
    expect(s().notes[id]).toBeDefined()
    expect(s().session.openTabIds).toEqual([])
    expect(s().session.closedStack).toEqual([id])
  })

  it('closedStack is capped at 20', () => {
    const { store, s } = setup()
    const ids = Array.from({ length: 25 }, () => filled(store))
    ids.forEach((id) => s().closeTab(id))
    expect(s().session.closedStack).toHaveLength(CLOSED_STACK_MAX)
    expect(s().session.closedStack.at(-1)).toBe(ids.at(-1))
  })

  it('reopenClosedTab restores the last closed tab and skips trashed/missing ids', () => {
    const { store, s } = setup()
    const a = filled(store, 'a')
    const b = filled(store, 'b')
    s().closeTab(a)
    s().closeTab(b)
    s().trashNote(b)
    s().reopenClosedTab()
    expect(s().session.openTabIds).toEqual([a])
    expect(s().session.activeTabId).toBe(a)
    expect(s().session.closedStack).toEqual([])
  })

  it('closeTab on pinned note is a no-op', () => {
    const { store, s } = setup()
    const id = filled(store)
    s().togglePin(id)
    s().closeTab(id)
    expect(s().session.openTabIds).toEqual([id])
  })

  it('closeOthers and closeToRight keep pinned tabs', () => {
    const { store, s } = setup()
    const p = filled(store, 'p')
    s().togglePin(p)
    const a = filled(store, 'a')
    const b = filled(store, 'b')
    const c = filled(store, 'c')
    s().closeToRight(a)
    expect(s().session.openTabIds).toEqual([p, a])
    s().openNote(b)
    s().openNote(c)
    s().closeOthers(b)
    expect(s().session.openTabIds).toEqual([p, b])
    expect(s().session.activeTabId).toBe(b)
  })

  it('moveTab cannot place an unpinned tab before a pinned one', () => {
    const { store, s } = setup()
    const p = filled(store, 'p')
    s().togglePin(p)
    const a = filled(store, 'a')
    const b = filled(store, 'b')
    s().moveTab(2, 0)
    expect(s().session.openTabIds).toEqual([p, b, a])
  })

  it('togglePin moves the tab into the pinned group', () => {
    const { store, s } = setup()
    const a = filled(store, 'a')
    const b = filled(store, 'b')
    s().togglePin(b)
    expect(s().session.openTabIds).toEqual([b, a])
    expect(s().notes[b].pinned).toBe(true)
    expect(orderedTabs(s()).map((n) => n.id)).toEqual([b, a])
  })

  it('closing the last tab leaves activeTabId null', () => {
    const { store, s } = setup()
    const id = filled(store)
    s().closeTab(id)
    expect(s().session.activeTabId).toBeNull()
    expect(activeNote(s())).toBeNull()
  })

  it('closing the active tab activates its right neighbour, else the left', () => {
    const { store, s } = setup()
    const a = filled(store, 'a')
    const b = filled(store, 'b')
    const c = filled(store, 'c')
    s().setActive(b)
    s().closeTab(b)
    expect(s().session.activeTabId).toBe(c)
    s().closeTab(c)
    expect(s().session.activeTabId).toBe(a)
  })

  it('goToTab(9) targets the last tab when fewer than 9 exist', () => {
    const { store, s } = setup()
    const a = filled(store, 'a')
    filled(store, 'b')
    const c = filled(store, 'c')
    s().goToTab(9)
    expect(s().session.activeTabId).toBe(c)
    s().goToTab(1)
    expect(s().session.activeTabId).toBe(a)
  })

  it('nextTab wraps around', () => {
    const { store, s } = setup()
    const a = filled(store, 'a')
    const b = filled(store, 'b')
    s().nextTab(1)
    expect(s().session.activeTabId).toBe(a)
    s().nextTab(-1)
    expect(s().session.activeTabId).toBe(b)
  })
})

describe('app store: notes', () => {
  it('renameNote trims and treats empty as auto-title', () => {
    const { store, s } = setup()
    const id = filled(store)
    s().renameNote(id, '  Plan  ')
    expect(s().notes[id].title).toBe('Plan')
    s().renameNote(id, '   ')
    expect(s().notes[id].title).toBeNull()
  })

  it('updateContent bumps updatedAt', () => {
    const { s } = setup()
    const id = s().newNote()
    const before = s().notes[id].updatedAt
    s().updateContent(id, 'x')
    expect(s().notes[id].content).toBe('x')
    expect(s().notes[id].updatedAt).toBeGreaterThan(before)
  })

  it('trashNote sets deletedAt, bumps updatedAt, closes its tab', () => {
    const { store, s } = setup()
    const id = filled(store)
    const before = s().notes[id].updatedAt
    s().trashNote(id)
    expect(s().notes[id].deletedAt).not.toBeNull()
    expect(s().notes[id].updatedAt).toBeGreaterThan(before)
    expect(s().session.openTabIds).toEqual([])
    expect(trashedNotes(s()).map((n) => n.id)).toEqual([id])
    expect(liveNotesSorted(s())).toEqual([])
  })

  it('trashNote works on a pinned note and unpins it', () => {
    const { store, s } = setup()
    const id = filled(store)
    s().togglePin(id)
    s().trashNote(id)
    expect(s().notes[id].pinned).toBe(false)
    expect(s().session.openTabIds).toEqual([])
  })

  it('restoreNote clears deletedAt and bumps updatedAt', () => {
    const { store, s } = setup()
    const id = filled(store)
    s().trashNote(id)
    const before = s().notes[id].updatedAt
    s().restoreNote(id)
    expect(s().notes[id].deletedAt).toBeNull()
    expect(s().notes[id].updatedAt).toBeGreaterThan(before)
  })

  it('purgeNote and emptyTrash only remove trashed notes', () => {
    const { store, s } = setup()
    const a = filled(store, 'a')
    const b = filled(store, 'b')
    const c = filled(store, 'c')
    s().purgeNote(a)
    expect(s().notes[a]).toBeDefined()
    s().trashNote(a)
    s().trashNote(b)
    s().purgeNote(a)
    expect(s().notes[a]).toBeUndefined()
    s().emptyTrash()
    expect(s().notes[b]).toBeUndefined()
    expect(s().notes[c]).toBeDefined()
  })

  it('duplicateNote copies content and opens next to the original', () => {
    const { store, s } = setup()
    const a = filled(store, 'hello')
    const b = filled(store, 'b')
    const copy = s().duplicateNote(a)
    expect(s().notes[copy].content).toBe('hello')
    expect(s().notes[copy].title).toBe('hello (copy)')
    expect(s().session.openTabIds).toEqual([a, copy, b])
  })

  it('liveNotesSorted puts pinned first, then most recently edited', () => {
    const { store, s } = setup()
    const a = filled(store, 'a')
    const b = filled(store, 'b')
    const c = filled(store, 'c')
    s().togglePin(a)
    s().updateContent(b, 'b2')
    expect(liveNotesSorted(s()).map((n) => n.id)).toEqual([a, b, c])
  })

  it('setViewState merges with defaults', () => {
    const { s } = setup()
    const id = s().newNote()
    s().setViewState(id, { head: 5 })
    expect(s().session.perTab[id]).toEqual({
      anchor: 0,
      head: 5,
      scrollTop: 0,
      previewMode: 'edit',
    })
  })
})

describe('app store: formats', () => {
  it('choosing a code or log format turns wrap off', () => {
    const { store, s } = setup()
    const id = filled(store)
    s().setLanguage(id, 'python')
    expect(s().notes[id]).toMatchObject({ language: 'python', wrap: false, mode: 'plain' })
    s().setLanguage(id, 'plaintext')
    expect(s().notes[id].wrap).toBe(true)
  })

  it('keeps wrap once the user toggled it on this tab', () => {
    const { store, s } = setup()
    const id = filled(store)
    s().toggleWrap(id)
    s().toggleWrap(id)
    expect(s().session.perTab[id].wrapTouched).toBe(true)
    s().setLanguage(id, 'log')
    expect(s().notes[id].wrap).toBe(true)
  })

  it('markdown format switches the note to markdown mode and back', () => {
    const { store, s } = setup()
    const id = filled(store)
    s().setLanguage(id, 'markdown')
    expect(s().notes[id].mode).toBe('markdown')
    s().setLanguage(id, 'json')
    expect(s().notes[id].mode).toBe('plain')
  })

  it('auto keeps the current wrap and mode', () => {
    const { store, s } = setup()
    const id = filled(store)
    s().setLanguage(id, 'go')
    s().setLanguage(id, 'auto')
    expect(s().notes[id]).toMatchObject({ language: 'auto', wrap: false, mode: 'plain' })
  })
})

describe('app store: reveal', () => {
  it('reveal records a request and the selection for the note', () => {
    const { store, s } = setup()
    const id = filled(store, 'hello world')
    s().reveal(id, 6, 11)
    expect(s().ui.reveal).toMatchObject({ noteId: id, from: 6, to: 11, nonce: 1 })
    expect(s().session.perTab[id]).toMatchObject({ anchor: 6, head: 11 })
    s().reveal(id, 6, 11)
    expect(s().ui.reveal?.nonce).toBe(2)
  })
})

describe('app store: text size per note', () => {
  it('sets one note’s size, clamped, leaving Settings and other notes alone', () => {
    const s = createAppStore().getState
    const a = s().newNote({ content: 'a' })
    const b = s().newNote({ content: 'b' })
    s().setNoteFontSize(a, 99, false)
    expect(s().notes[a].fontSize).toBe(72)
    expect(s().notes[b].fontSize).toBeUndefined()
    expect(s().settings.editorFontSize).toBe(14)
    s().setNoteFontSize(a, 18, true)
    expect(s().notes[a].phoneFontSize).toBe(18)
    expect(s().notes[a].fontSize).toBe(72)
  })

  it('going back to the Settings size follows Settings again', () => {
    const s = createAppStore().getState
    const a = s().newNote({ content: 'a' })
    s().setNoteFontSize(a, 15, false)
    s().setNoteFontSize(a, 14, false)
    expect(s().notes[a].fontSize).toBeUndefined()
  })

  it('a duplicate keeps the size', () => {
    const s = createAppStore().getState
    const a = s().newNote({ content: 'a' })
    s().setNoteFontSize(a, 20, false)
    const copy = s().duplicateNote(a)
    expect(s().notes[copy].fontSize).toBe(20)
  })
})

describe('app store: the side note stays consistent', () => {
  it('closing the active tab never leaves the side note as the active one', () => {
    const { store, s } = setup()
    const a = filled(store)
    const b = filled(store)
    const c = filled(store)
    s().setActive(b)
    s().setSplitNote(c)
    s().closeTab(b)
    expect(s().session.activeTabId).toBe(c)
    expect(s().session.splitNoteId).toBeNull()
    void a
  })

  it('a note trashed in another window leaves the side and the closed list', () => {
    const { store, s } = setup()
    const a = filled(store)
    const x = filled(store)
    s().closeTab(x)
    s().setActive(a)
    s().setSplitNote(x)
    s().applyRemoteNote({ ...s().notes[x], deletedAt: 5000, rev: 2 })
    expect(s().session.splitNoteId).toBeNull()
    expect(s().session.closedStack).not.toContain(x)
  })

  it('importing a newer trashed copy of an open note closes its tab; pins are kept', () => {
    const { store, s } = setup()
    const a = filled(store)
    const p = filled(store)
    s().togglePin(p)
    s().importNotes([
      { ...s().notes[a], content: 'gone', deletedAt: 9000, updatedAt: 9000 },
      { ...s().notes[p], content: 'newer', updatedAt: 9000 },
    ])
    expect(s().session.openTabIds).not.toContain(a)
    expect(s().notes[p].pinned).toBe(true)
  })
})
