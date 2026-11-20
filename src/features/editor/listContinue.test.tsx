import { act, render, waitFor } from '@testing-library/react'
import { language } from '@codemirror/language'
import { EditorView, runScopeHandlers } from '@codemirror/view'
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
