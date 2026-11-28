import { act, render, waitFor } from '@testing-library/react'
import { ensureSyntaxTree, language } from '@codemirror/language'
import { EditorView, runScopeHandlers } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'
import { createAppStore, initStore } from '../../store/store'
import { Editor } from './Editor'

async function markdownEditor(content: string) {
  const store = initStore(createAppStore())
  const s = () => store.getState()
  const id = s().newNote()
  s().updateContent(id, content)
  s().setLanguage(id, 'markdown')
  const utils = render(<Editor noteId={id} />)
  const view = EditorView.findFromDOM(utils.container.querySelector('.cm-editor') as HTMLElement)!
  await waitFor(() => expect(view.state.facet(language)?.name).toBe('markdown'))
  act(() => view.dispatch({ selection: { anchor: view.state.doc.length } }))
  return view
}

const enter = (v: EditorView) =>
  act(() => void runScopeHandlers(v, new KeyboardEvent('keydown', { key: 'Enter' }), 'editor'))

describe('lists continue on Enter in Markdown notes', () => {
  it('Backspace right after a new marker takes the marker away', async () => {
    const v = await markdownEditor('- milk\n- ')
    act(
      () => void runScopeHandlers(v, new KeyboardEvent('keydown', { key: 'Backspace' }), 'editor'),
    )
    expect(v.state.doc.toString()).not.toMatch(/- $/)
  })

  it('bullets, numbers and checklists carry on', async () => {
    for (const [start, next] of [
      ['- milk', '- milk\n- '],
      ['1. one', '1. one\n2. '],
      ['- [x] done', '- [x] done\n- [ ] '],
      ['> quote', '> quote\n> '],
    ]) {
      const v = await markdownEditor(start)
      enter(v)
      expect(v.state.doc.toString()).toBe(next)
      v.destroy()
    }
  })

  it('Enter on an empty item ends the list', async () => {
    const v = await markdownEditor('- milk\n- ')
    enter(v)
    expect(v.state.doc.toString()).toBe('- milk\n')
  })
})

const tab = (v: EditorView, shift = false) =>
  act(
    () =>
      void runScopeHandlers(
        v,
        new KeyboardEvent('keydown', { key: 'Tab', shiftKey: shift }),
        'editor',
      ),
  )

/** How many items the outermost list has (a nested item belongs to its parent's item). */
function topLevelItems(v: EditorView): number {
  const tree = ensureSyntaxTree(v.state, v.state.doc.length, 1000)!
  const list = tree.topNode.firstChild!
  let n = 0
  for (let c = list.firstChild; c; c = c.nextSibling) if (c.name === 'ListItem') n++
  return n
}

describe('Tab nests a list item under the one above', () => {
  it('a numbered item, by the width of "1. ", starting its own list at 1', async () => {
    const v = await markdownEditor('1. one\n2. two')
    tab(v)
    expect(v.state.doc.toString()).toBe('1. one\n   1. two')
    expect(topLevelItems(v)).toBe(1)
  })

  it('bullets and checklist items', async () => {
    for (const [start, nested] of [
      ['- one\n- two', '- one\n  - two'],
      ['- [ ] a\n- [ ] b', '- [ ] a\n  - [ ] b'],
      ['1. a\n   1. b\n   2. c', '1. a\n   1. b\n      1. c'],
    ]) {
      const v = await markdownEditor(start)
      tab(v)
      expect(v.state.doc.toString()).toBe(nested)
      v.destroy()
    }
  })

  it('Shift+Tab moves it back out to its parent’s level', async () => {
    const v = await markdownEditor('1. one\n   1. two')
    tab(v, true)
    expect(v.state.doc.toString()).toBe('1. one\n1. two')
    expect(topLevelItems(v)).toBe(2)
  })

  it('works with tab-indented lists, measuring a tab as the note’s tab size', async () => {
    const v = await markdownEditor('- top\n\t- a\n\t- b')
    tab(v)
    // Under "\t- a" (its text at column 2 past the tab), keeping the tab.
    expect(v.state.doc.toString()).toBe('- top\n\t- a\n\t  - b')
    v.destroy()
    const w = await markdownEditor('- top\n\t- a\n\t\t- b')
    tab(w, true)
    expect(w.state.doc.toString()).toBe('- top\n\t- a\n\t- b')
  })

  it('with several cursors, indents each line as before', async () => {
    const v = await markdownEditor('- a\n- b\n- c')
    act(() =>
      v.dispatch({
        selection: EditorSelection.create([EditorSelection.cursor(7), EditorSelection.cursor(11)]),
      }),
    )
    tab(v)
    const lines = v.state.doc.toString().split('\n')
    expect(lines[0]).toBe('- a')
    expect(lines[1]).toMatch(/^\s+- b$/)
    expect(lines[2]).toMatch(/^\s+- c$/)
  })

  it('leaves Tab alone outside lists', async () => {
    const v = await markdownEditor('plain line')
    tab(v)
    expect(v.state.doc.toString()).toBe('  plain line')
  })
})
