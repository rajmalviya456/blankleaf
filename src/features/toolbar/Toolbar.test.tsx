import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditorView } from '@codemirror/view'
import { createAppStore, initStore } from '../../store/store'
import { Editor } from '../editor/Editor'
import { Toolbar } from './Toolbar'
import { toastStore } from '../../ui/toast'
import { COMMANDS } from '../../commands/registry'

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

  it('shows the formatting key in the tooltip only once the note is Markdown', () => {
    const { s, id } = setup('x', false)
    expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute('title', 'Bold')
    act(() => s().setNoteMode(id, 'markdown'))
    expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute('title', 'Bold (Ctrl+B)')
    expect(screen.getByRole('button', { name: 'Link' })).toHaveAttribute(
      'title',
      'Link (Ctrl+Shift+K)',
    )
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
    expect(s().notes[id].content).toBe('ship tabs') // the markers go too
  })

  it('Undo on the Markdown switch keeps later typing', async () => {
    const user = userEvent.setup()
    const { view, id, s } = setup('ship tabs', false)
    act(() => view.dispatch({ selection: { anchor: 5, head: 9 } }))
    await user.click(screen.getByRole('button', { name: 'Bold' }))
    act(() => view.dispatch({ changes: { from: 0, insert: '>' } }))
    act(() => toastStore.getState().toasts.at(-1)!.action!.run())
    expect(s().notes[id].mode).toBe('plain')
    expect(s().notes[id].content).toBe('>ship **tabs**')
  })

  it('a text size can be typed: Enter applies it, clamped to 10–72', async () => {
    const user = userEvent.setup()
    const { s, id } = setup('x', false)
    const field = screen.getByRole('spinbutton', { name: 'Text size' })
    await user.clear(field)
    await user.type(field, '40{Enter}')
    expect(s().notes[id].fontSize).toBe(40)
    await user.clear(field)
    await user.type(field, '500{Enter}')
    expect(s().notes[id].fontSize).toBe(72)
    expect(s().settings.editorFontSize).toBe(14)
    expect(field).toHaveValue(72)
  })

  it('bolds the selection and saves it to the note', async () => {
    const user = userEvent.setup()
    const { view, id, s } = setup('ship tabs', true)
    act(() => view.dispatch({ selection: { anchor: 5, head: 9 } }))
    await user.click(screen.getByRole('button', { name: 'Bold' }))
    expect(s().notes[id].content).toBe('ship **tabs**')
  })

  it('changes this note’s text size within bounds', async () => {
    const user = userEvent.setup()
    const { s, id } = setup('x', false)
    const before = s().settings.editorFontSize
    await user.click(screen.getByRole('button', { name: 'Larger text' }))
    expect(s().notes[id].fontSize).toBe(before + 1)
    expect(s().settings.editorFontSize).toBe(before)
    act(() => s().setNoteFontSize(id, 72, false))
    expect(screen.getByRole('button', { name: 'Larger text' })).toBeDisabled()
  })

  it('picks a font for this note only, and can go back to the Settings one', async () => {
    const user = userEvent.setup()
    const { s, id, view } = setup('x', false)
    await user.click(screen.getByRole('button', { name: 'Font' }))
    await user.click(await screen.findByRole('menuitemradio', { name: 'Serif' }))
    expect(s().notes[id].font).toBe('serif')
    expect(s().settings.editorFont).toBe('mono')
    expect(view.dom.closest('[style]')?.getAttribute('style')).toContain('--font-serif')
    await user.click(screen.getByRole('button', { name: 'Font' }))
    await user.click(await screen.findByRole('menuitemradio', { name: /Same as Settings/ }))
    expect(s().notes[id].font).toBeUndefined()
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

describe('Transform menu', () => {
  it('formats the note as JSON from the toolbar', async () => {
    const user = userEvent.setup()
    const { id, s } = setup('{"a":1}', false)
    await user.click(screen.getByRole('button', { name: 'Transform' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Format JSON' }))
    await vi.waitFor(() => expect(s().notes[id].content).toBe('{\n  "a": 1\n}'))
  })

  it('explains invalid input instead of changing the note', async () => {
    const user = userEvent.setup()
    const { id, s } = setup('not json', false)
    await user.click(screen.getByRole('button', { name: 'Transform' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Format JSON' }))
    await vi.waitFor(() =>
      expect(toastStore.getState().toasts.at(-1)?.msg).toMatch(/^Not valid JSON/),
    )
    expect(s().notes[id].content).toBe('not json')
  })

  it('is on the compact (phone) toolbar too', () => {
    const store = initStore(createAppStore())
    const id = store.getState().newNote()
    render(<Toolbar noteId={id} compact />)
    expect(screen.getAllByRole('button', { name: 'Transform' }).length).toBeGreaterThan(0)
  })

  it('every transform is also a palette command', () => {
    const ids = COMMANDS.filter((c) => c.id.startsWith('text.')).map((c) => c.title)
    expect(ids).toEqual(expect.arrayContaining(['Format JSON', 'URL decode', 'YAML → JSON']))
  })
})

describe('code tools', () => {
  it('code notes get Indent, Outdent and Comment buttons that work without a keyboard', async () => {
    const { id, s } = setup('let x = 1', false)
    act(() => s().setLanguage(id, 'javascript'))
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Indent' }))
    expect(s().notes[id].content).toBe('  let x = 1')
    await user.click(screen.getByRole('button', { name: 'Outdent' }))
    expect(s().notes[id].content).toBe('let x = 1')
    // Comment syntax comes from the language, which loads lazily.
    await vi.waitFor(async () => {
      await user.click(screen.getByRole('button', { name: 'Comment line' }))
      expect(s().notes[id].content).toBe('// let x = 1')
    })
  })

  it('plain text notes don’t show them', () => {
    setup('x', false)
    expect(screen.queryByRole('button', { name: 'Indent' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Comment line' })).toBeNull()
  })
})

describe('Outline', () => {
  const DOC = '# Title\n\nintro\n\n## Part one\n\ntext\n\n## Part two\n\nend'

  it('lists a Markdown note’s headings and jumps to one', async () => {
    const { id, s, view } = setup(DOC, true)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Outline' }))
    const items = await screen.findAllByRole('menuitem')
    expect(items.map((i) => i.textContent)).toEqual(['Title', 'Part one', 'Part two'])
    await user.click(screen.getByRole('menuitem', { name: 'Part two' }))
    const at = DOC.indexOf('## Part two')
    expect(s().ui.reveal).toMatchObject({ noteId: id, from: at, to: at })
    await vi.waitFor(() => expect(view.state.selection.main.head).toBe(at))
  })

  it('switches from preview-only to side by side, so the jump is visible', async () => {
    const { id, s } = setup(DOC, true)
    act(() => s().setViewState(id, { previewMode: 'preview' }))
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Outline' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Part one' }))
    expect(s().session.perTab[id]?.previewMode).toBe('split')
  })

  it('can keep the outline open beside the note', async () => {
    const { s } = setup(DOC, true)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Outline' }))
    await user.click(
      await screen.findByRole('menuitemcheckbox', { name: 'Keep open beside the note' }),
    )
    expect(s().settings.showOutline).toBe(true)
  })

  it('says when there are no headings yet', async () => {
    setup('no headings', true)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Outline' }))
    expect(await screen.findByText(/No headings yet/)).toBeInTheDocument()
  })

  it('isn’t offered for plain text notes', () => {
    const { id, s } = setup(DOC, false)
    act(() => s().setLanguage(id, 'plaintext'))
    expect(screen.queryByRole('button', { name: 'Outline' })).toBeNull()
  })
})
