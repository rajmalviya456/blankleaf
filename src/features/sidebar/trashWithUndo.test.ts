import { act } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { createAppStore, initStore } from '../../store/store'
import { toastStore } from '../../ui/toast'
import { trashWithUndo } from './trashWithUndo'

afterEach(() => toastStore.getState().clear())

function setup(names = ['one', 'two', 'three']) {
  const store = initStore(createAppStore())
  const s = () => store.getState()
  const ids = names.map((content) => s().newNote({ content }))
  return { s, ids }
}
const undo = () => act(() => toastStore.getState().toasts.at(-1)!.action!.run())

describe('trashWithUndo', () => {
  it('moves the note to Trash and says so, with an Undo', () => {
    const { s, ids } = setup()
    trashWithUndo(ids[1])
    expect(s().notes[ids[1]].deletedAt).not.toBeNull()
    expect(s().session.openTabIds).toEqual([ids[0], ids[2]])
    const t = toastStore.getState().toasts.at(-1)!
    expect(t.msg).toBe('Moved “two” to Trash')
    expect(t.action?.label).toBe('Undo')
  })

  it('Undo brings the open note back to its tab, in its place, and active again', () => {
    const { s, ids } = setup()
    act(() => s().setActive(ids[1]))
    trashWithUndo(ids[1])
    undo()
    expect(s().notes[ids[1]].deletedAt).toBeNull()
    expect(s().session.openTabIds).toEqual(ids)
    expect(s().session.activeTabId).toBe(ids[1])
  })

  it('Undo for a tab in the background keeps the note you were on', () => {
    const { s, ids } = setup()
    act(() => s().setActive(ids[2]))
    trashWithUndo(ids[0])
    undo()
    expect(s().session.openTabIds).toEqual(ids)
    expect(s().session.activeTabId).toBe(ids[2])
  })

  it('Undo for a note that had no tab restores it without opening one', () => {
    const { s, ids } = setup()
    act(() => s().closeTab(ids[0]))
    trashWithUndo(ids[0])
    undo()
    expect(s().notes[ids[0]].deletedAt).toBeNull()
    expect(s().session.openTabIds).toEqual([ids[1], ids[2]])
  })

  it('Undo puts the pin back', () => {
    const { s, ids } = setup()
    act(() => s().togglePin(ids[2]))
    trashWithUndo(ids[2])
    undo()
    expect(s().notes[ids[2]].pinned).toBe(true)
    expect(s().session.openTabIds[0]).toBe(ids[2])
  })

  it('Undo does nothing once the note is gone for good', () => {
    const { s, ids } = setup()
    trashWithUndo(ids[1])
    act(() => s().purgeNote(ids[1]))
    undo()
    expect(s().notes[ids[1]]).toBeUndefined()
    expect(s().session.openTabIds).toEqual([ids[0], ids[2]])
  })
})
