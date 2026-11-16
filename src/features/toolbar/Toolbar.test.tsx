import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditorView } from '@codemirror/view'
import { createAppStore, initStore } from '../../store/store'
import { Editor } from '../editor/Editor'
import { Toolbar } from './Toolbar'

function setup(content: string, markdown: boolean) {
  const store = initStore(createAppStore())
  const id = store.getState().newNote()
  store.getState().updateContent(id, content)
  if (markdown) store.getState().setNoteMode(id, 'markdown')
  const utils = render(
    <>
      <Toolbar noteId={id} />
      <Editor noteId={id} />
    </>,
  )
  const view = EditorView.findFromDOM(utils.container.querySelector('.cm-editor') as HTMLElement)!
  return { store, id, view, s: () => store.getState() }
}

describe('Toolbar', () => {
  it('shows formatting buttons for Markdown notes only', () => {
    setup('x', true)
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Change case' })).toBeNull()
  })

  it('shows text tools, not formatting, for plain notes', () => {
    setup('x', false)
    expect(screen.queryByRole('button', { name: 'Bold' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Change case' })).toBeInTheDocument()
  })

  it('bolds the selection and saves it to the note', async () => {
    const user = userEvent.setup()
    const { view, id, s } = setup('ship tabs', true)
    act(() => view.dispatch({ selection: { anchor: 5, head: 9 } }))
    await user.click(screen.getByRole('button', { name: 'Bold' }))
    expect(s().notes[id].content).toBe('ship **tabs**')
  })

  it('changes the editor font size within bounds', async () => {
    const user = userEvent.setup()
    const { s } = setup('x', false)
    const before = s().settings.editorFontSize
    await user.click(screen.getByRole('button', { name: 'Larger text' }))
    expect(s().settings.editorFontSize).toBe(before + 1)
    act(() => s().updateSettings({ editorFontSize: 28 }))
    expect(screen.getByRole('button', { name: 'Larger text' })).toBeDisabled()
  })

  it('sorts lines from the Line tools menu', async () => {
    const user = userEvent.setup()
    const { id, s } = setup('b\na', false)
    await user.click(screen.getByRole('button', { name: 'Line tools' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Sort lines A→Z' }))
    expect(s().notes[id].content).toBe('a\nb')
  })
})
