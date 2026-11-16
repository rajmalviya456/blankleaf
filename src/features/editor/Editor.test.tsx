import { act, render } from '@testing-library/react'
import { language } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { createAppStore, initStore } from '../../store/store'
import { Editor } from './Editor'

function setup(content = 'hello\nworld') {
  const store = initStore(createAppStore())
  const id = store.getState().newNote()
  store.getState().updateContent(id, content)
  const utils = render(<Editor noteId={id} />)
  const dom = utils.container.querySelector('.cm-editor') as HTMLElement
  const view = EditorView.findFromDOM(dom)!
  return { store, id, view, s: () => store.getState() }
}

describe('Editor', () => {
  it('shows the note content', () => {
    const { view } = setup('abc')
    expect(view.state.doc.toString()).toBe('abc')
  })

  it('typing calls updateContent with new text', () => {
    const { view, id, s } = setup('abc')
    act(() => view.dispatch({ changes: { from: 3, insert: 'def' } }))
    expect(s().notes[id].content).toBe('abcdef')
  })

  it('reports selection changes to the session view state', () => {
    const { view, id, s } = setup('hello\nworld')
    act(() => view.dispatch({ selection: { anchor: 2, head: 8 } }))
    expect(s().session.perTab[id]).toMatchObject({ anchor: 2, head: 8 })
  })

  it('restores the saved selection on mount', () => {
    const store = initStore(createAppStore())
    const id = store.getState().newNote()
    store.getState().updateContent(id, 'hello\nworld')
    store.getState().setViewState(id, { anchor: 7, head: 9 })
    const { container } = render(<Editor noteId={id} />)
    const view = EditorView.findFromDOM(container.querySelector('.cm-editor') as HTMLElement)!
    expect(view.state.selection.main.anchor).toBe(7)
    expect(view.state.selection.main.head).toBe(9)
  })

  it('clamps a saved selection that is past the end', () => {
    const store = initStore(createAppStore())
    const id = store.getState().newNote()
    store.getState().updateContent(id, 'hi')
    store.getState().setViewState(id, { anchor: 50, head: 50 })
    const { container } = render(<Editor noteId={id} />)
    const view = EditorView.findFromDOM(container.querySelector('.cm-editor') as HTMLElement)!
    expect(view.state.selection.main.head).toBe(2)
  })
})

describe('Editor formats', () => {
  it('applies syntax highlighting for the note format', async () => {
    const store = initStore(createAppStore())
    const id = store.getState().newNote()
    store.getState().updateContent(id, 'def f():\n    return 1')
    store.getState().setLanguage(id, 'python')
    const { container } = render(<Editor noteId={id} />)
    const view = EditorView.findFromDOM(container.querySelector('.cm-editor') as HTMLElement)!
    await vi.waitFor(() => expect(view.state.facet(language)?.name).toBe('python'))
  })

  it('auto-detects the format of an auto note and saves it', async () => {
    const store = initStore(createAppStore())
    const id = store.getState().newNote()
    store.getState().updateContent(id, '{\n  "a": 1,\n  "b": [true]\n}')
    render(<Editor noteId={id} />)
    await vi.waitFor(() => expect(store.getState().notes[id].language).toBe('json'))
  })

  it('leaves plain prose on auto', async () => {
    const store = initStore(createAppStore())
    const id = store.getState().newNote()
    store.getState().updateContent(id, 'Call Sam about the budget tomorrow.')
    render(<Editor noteId={id} />)
    await new Promise((r) => setTimeout(r, 50))
    expect(store.getState().notes[id].language).toBe('auto')
  })
})
