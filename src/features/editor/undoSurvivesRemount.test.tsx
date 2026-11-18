import { undo, undoDepth } from '@codemirror/commands'
import { act, render } from '@testing-library/react'
import { EditorView } from '@codemirror/view'
import { afterEach, describe, expect, it } from 'vitest'
import { stubMedia } from '../../../tests/media'
import { App } from '../../app/App'
import { createAppStore, initStore } from '../../store/store'
import { getActiveView } from './activeView'
import { Editor } from './Editor'

let media: ReturnType<typeof stubMedia> | undefined
afterEach(() => media?.restore())

const viewIn = (el: HTMLElement) =>
  EditorView.findFromDOM(el.querySelector('.cm-editor') as HTMLElement)!

describe('undo history survives the editor remounting', () => {
  it('unmount and mount again: undo still works', () => {
    const store = initStore(createAppStore())
    const id = store.getState().newNote()
    store.getState().updateContent(id, 'abc')
    const first = render(<Editor noteId={id} />)
    act(() => viewIn(first.container).dispatch({ changes: { from: 3, insert: 'def' } }))
    first.unmount()
    const second = render(<Editor noteId={id} />)
    const view = viewIn(second.container)
    expect(undoDepth(view.state)).toBe(1)
    act(() => void undo(view))
    expect(store.getState().notes[id].content).toBe('abc')
  })

  it('is not reused when the note changed meanwhile', () => {
    const store = initStore(createAppStore())
    const id = store.getState().newNote()
    store.getState().updateContent(id, 'abc')
    const first = render(<Editor noteId={id} />)
    act(() => viewIn(first.container).dispatch({ changes: { from: 3, insert: 'def' } }))
    first.unmount()
    store.getState().updateContent(id, 'from another device')
    const second = render(<Editor noteId={id} />)
    const view = viewIn(second.container)
    expect(view.state.doc.toString()).toBe('from another device')
    expect(undoDepth(view.state)).toBe(0)
  })

  it.each([
    ['phone → laptop', true],
    ['laptop → phone', false],
  ])('switching layout (%s) keeps the history', (_, startPhone) => {
    media = stubMedia({ phone: startPhone, touch: startPhone })
    const store = initStore(createAppStore())
    const id = store.getState().newNote()
    store.getState().updateContent(id, 'abc')
    render(<App />)
    act(() => getActiveView()!.dispatch({ changes: { from: 3, insert: 'def' } }))
    media.set({ phone: !startPhone, touch: !startPhone })
    expect(undoDepth(getActiveView()!.state)).toBe(1)
  })
})
