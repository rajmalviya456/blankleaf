import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditorView } from '@codemirror/view'
import { createAppStore, initStore } from '../../store/store'
import { Editor } from '../editor/Editor'
import { Toolbar } from './Toolbar'
import { toastStore } from '../../ui/toast'

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
  it('Markdown notes get formatting, not the text tools', () => {
    setup('x', true)
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Change case' })).toBeNull()
  })

  it('plain-text notes get formatting and the text tools', () => {
    setup('x', false)
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Change case' })).toBeInTheDocument()
  })

  it('code and log notes keep only the text tools', () => {
    const { s, id } = setup('x = 1', false)
    act(() => s().setLanguage(id, 'python'))
    expect(screen.queryByRole('button', { name: 'Bold' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Change case' })).toBeInTheDocument()
  })

  it('formatting a plain-text note switches it to Markdown, with Undo', async () => {
    const user = userEvent.setup()
    const { view, id, s } = setup('ship tabs', false)
    act(() => view.dispatch({ selection: { anchor: 5, head: 9 } }))
    await user.click(screen.getByRole('button', { name: 'Bold' }))
    expect(s().notes[id].content).toBe('ship **tabs**')
    expect(s().notes[id].mode).toBe('markdown')
    const t = toastStore.getState().toasts.at(-1)!
    expect(t.msg).toBe('Switched this note to Markdown')
    act(() => t.action!.run())
    expect(s().notes[id].mode).toBe('plain')
  })

  it('a text size can be typed: Enter applies it, clamped to 10–72', async () => {
    const user = userEvent.setup()
    const { s } = setup('x', false)
    const field = screen.getByRole('spinbutton', { name: 'Text size' })
    await user.clear(field)
    await user.type(field, '40{Enter}')
    expect(s().settings.editorFontSize).toBe(40)
    await user.clear(field)
    await user.type(field, '500{Enter}')
    expect(s().settings.editorFontSize).toBe(72)
    expect(field).toHaveValue(72)
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
    act(() => s().updateSettings({ editorFontSize: 72 }))
    expect(screen.getByRole('button', { name: 'Larger text' })).toBeDisabled()
  })

  it('sorts lines from the Line tools menu', async () => {
    const user = userEvent.setup()
    const { id, s } = setup('b\na', false)
    await user.click(screen.getByRole('button', { name: 'Line tools' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Sort lines A→Z' }))
    expect(s().notes[id].content).toBe('a\nb')
  })

  it('enables undo and redo only when there is history', async () => {
    const user = userEvent.setup()
    const { view } = setup('abc', false)
    const undoBtn = () => screen.getByRole('button', { name: 'Undo' })
    const redoBtn = () => screen.getByRole('button', { name: 'Redo' })
    expect(undoBtn()).toBeDisabled()
    expect(redoBtn()).toBeDisabled()
    act(() => view.dispatch({ changes: { from: 3, insert: 'd' } }))
    expect(undoBtn()).toBeEnabled()
    expect(redoBtn()).toBeDisabled()
    await user.click(undoBtn())
    expect(undoBtn()).toBeDisabled()
    expect(redoBtn()).toBeEnabled()
  })
})
