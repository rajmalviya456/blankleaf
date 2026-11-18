import { describe, expect, it } from 'vitest'
import { createAppStore, initStore } from './store'
import { isFreshVisit, startOnBlankLeaf } from './freshStart'

function setup() {
  const store = initStore(createAppStore())
  const s = () => store.getState()
  return { store, s }
}
const active = (s: ReturnType<typeof setup>['s']) => s().notes[s().session.activeTabId!]

describe('which visits start on a blank page', () => {
  it('opening the address does; reloading or going back doesn’t', () => {
    expect(isFreshVisit('navigate')).toBe(true)
    expect(isFreshVisit(undefined)).toBe(true)
    expect(isFreshVisit('reload')).toBe(false)
    expect(isFreshVisit('back_forward')).toBe(false)
  })
})

describe('starting on a blank leaf', () => {
  it('shows one blank note, and keeps every earlier note saved', () => {
    const { store, s } = setup()
    const a = s().newNote({ content: 'old one' })
    const b = s().newNote({ content: 'old two' })
    startOnBlankLeaf(store)
    expect(s().session.openTabIds).toHaveLength(1)
    expect(active(s).content).toBe('')
    expect(active(s).title).toBeNull()
    expect(s().notes[a].content).toBe('old one')
    expect(s().notes[b].content).toBe('old two')
  })

  it('earlier tabs can be reopened, the last-used one first', () => {
    const { store, s } = setup()
    const a = s().newNote({ content: 'first' })
    const b = s().newNote({ content: 'second' })
    s().setActive(a)
    startOnBlankLeaf(store)
    expect(s().session.closedStack.at(-1)).toBe(a)
    expect(s().session.closedStack).toContain(b)
    s().reopenClosedTab()
    expect(s().session.activeTabId).toBe(a)
  })

  it('keeps pinned notes in their tabs, behind the blank page', () => {
    const { store, s } = setup()
    const pinned = s().newNote({ content: 'always here', pinned: true })
    s().newNote({ content: 'not pinned' })
    startOnBlankLeaf(store)
    expect(s().session.openTabIds).toContain(pinned)
    expect(s().session.openTabIds).toHaveLength(2)
    expect(active(s).content).toBe('')
  })

  it('reuses a blank note instead of piling up empty ones', () => {
    const { store, s } = setup()
    s().newNote({ content: 'old' })
    const blank = s().newNote()
    startOnBlankLeaf(store)
    expect(s().session.activeTabId).toBe(blank)
    expect(Object.values(s().notes).filter((n) => !n.content)).toHaveLength(1)
  })

  it('never treats a locked note as blank', () => {
    const { store, s } = setup()
    const locked = {
      v: 1,
      salt: 'AA==',
      iv: 'AA==',
      data: 'AA==',
      iterations: 1000,
      origin: 'x',
    } as const
    const id = s().newNote({ locked })
    startOnBlankLeaf(store)
    expect(s().session.activeTabId).not.toBe(id)
    expect(s().notes[id].locked).toBeDefined()
  })

  it('closes the note that was beside the active one', () => {
    const { store, s } = setup()
    const a = s().newNote({ content: 'side' })
    s().newNote({ content: 'main' })
    s().setSplitNote(a)
    startOnBlankLeaf(store)
    expect(s().session.splitNoteId).toBeNull()
  })
})
