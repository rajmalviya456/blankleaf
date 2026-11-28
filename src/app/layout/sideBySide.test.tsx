import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { stubMedia } from '../../../tests/media'
import { COMMANDS, commandEnabled } from '../../commands/registry'
import { getActiveView } from '../../features/editor/activeView'
import { createAppStore, getStore, initStore } from '../../store/store'
import { EditorView } from '@codemirror/view'
import { App } from '../App'

let media: ReturnType<typeof stubMedia> | undefined
afterEach(() => media?.restore())

function setup(flags = { wide: true }) {
  media = stubMedia(flags)
  const store = initStore(createAppStore())
  const s = () => store.getState()
  const a = s().newNote({ title: 'Alpha', content: 'alpha text' })
  const b = s().newNote({ title: 'Beta', content: 'beta text' })
  return { store, s, a, b }
}
const pane = () => screen.queryByRole('region', { name: /^Side note/ })

describe('two notes side by side', () => {
  it('shows the second note next to the active one, and both can be edited', async () => {
    const { s, a, b } = setup()
    act(() => s().setSplitNote(a))
    render(<App />)
    expect(s().session.activeTabId).toBe(b)
    const side = pane()!
    expect(side).toHaveAccessibleName('Side note: Alpha')
    expect(within(side).getByText('alpha text')).toBeInTheDocument()
    // The toolbar keeps working on the main note.
    expect(getActiveView()?.state.doc.toString()).toBe('beta text')
  })

  it('swaps places when the side note’s tab is chosen', () => {
    const { s, a, b } = setup()
    act(() => s().setSplitNote(a))
    act(() => s().setActive(a))
    expect(s().session.activeTabId).toBe(a)
    expect(s().session.splitNoteId).toBe(b)
  })

  it('closes with its button', async () => {
    const { s, a } = setup()
    act(() => s().setSplitNote(a))
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Close side note' }))
    expect(s().session.splitNoteId).toBeNull()
    expect(pane()).toBeNull()
  })

  it('goes away when its note is trashed', () => {
    const { s, a } = setup()
    act(() => s().setSplitNote(a))
    render(<App />)
    act(() => s().trashNote(a))
    expect(pane()).toBeNull()
  })

  it('needs a wide screen: narrow windows and phones show one note', () => {
    const { s, a } = setup({ wide: false })
    act(() => s().setSplitNote(a))
    render(<App />)
    expect(pane()).toBeNull()
  })

  it('opens from the palette with the previous tab', () => {
    const { store, s, a } = setup()
    const open = COMMANDS.find((c) => c.id === 'view.split.open')!
    expect(open.title).toBe('Open another note side by side')
    expect(commandEnabled(open, s())).toBe(true)
    act(() => open.run({ store }))
    expect(s().session.splitNoteId).toBe(a)
    const close = COMMANDS.find((c) => c.id === 'view.split.close')!
    expect(commandEnabled(close, s())).toBe(true)
    act(() => close.run({ store }))
    expect(s().session.splitNoteId).toBeNull()
  })
})

describe('text size is per note', () => {
  it('changing the size in one note’s toolbar leaves the side note alone', async () => {
    const { s, a, b } = setup()
    act(() => s().setSplitNote(a))
    render(<App />)
    const before = s().settings.editorFontSize
    await userEvent.click(screen.getByRole('button', { name: 'Larger text' }))
    await userEvent.click(screen.getByRole('button', { name: 'Larger text' }))
    expect(s().notes[b].fontSize).toBe(before + 2)
    expect(s().notes[a].fontSize).toBeUndefined()
    expect(s().settings.editorFontSize).toBe(before)
    expect(screen.getByRole('spinbutton', { name: 'Text size' })).toHaveValue(before + 2)
  })
})

describe('working in the side note', () => {
  const run = (id: string) =>
    act(() => COMMANDS.find((c) => c.id === id)!.run({ store: getStore() }))

  it('commands act on the side note while it has the cursor', () => {
    const { s, a, b } = setup()
    act(() => s().setSplitNote(a))
    render(<App />)
    act(() => s().setUi({ sideFocused: true }))
    const wrapA = s().notes[a].wrap
    run('view.wrap')
    expect(s().notes[a].wrap).toBe(!wrapA)
    run('note.pin')
    expect(s().notes[a].pinned).toBe(true)
    expect(s().notes[b].pinned).toBe(false)
  })

  it('the Edit/Split/Preview choice shows in the side pane', async () => {
    const { s, a } = setup()
    act(() => s().setNoteMode(a, 'markdown'))
    act(() => s().setSplitNote(a))
    render(<App />)
    act(() => s().setViewState(a, { previewMode: 'preview' }))
    expect(
      await within(pane()!).findByText('alpha text', { selector: '.md-preview *' }),
    ).toBeInTheDocument()
  })

  it('the toolbar stays for an open side note when the main note is locked', () => {
    const { s, a, b } = setup()
    act(() => s().setSplitNote(a))
    act(() =>
      s().applyLock(b, { v: 1, salt: 's', iv: 'i', data: 'd', iterations: 1, origin: b }, 'Locked'),
    )
    render(<App />)
    act(() => s().setUi({ sideFocused: true }))
    expect(screen.getByRole('toolbar', { name: 'Editor toolbar' })).toBeInTheDocument()
  })

  it('jumping to a heading (Outline) works in the side note', () => {
    const { s, a } = setup()
    act(() => s().updateContent(a, '# One\ntext\n# Two\nmore'))
    act(() => s().setSplitNote(a))
    render(<App />)
    act(() => s().reveal(a, 11, 11))
    const view = EditorView.findFromDOM(pane()!.querySelector('.cm-editor') as HTMLElement)!
    expect(view.state.selection.main.head).toBe(11)
  })
})

describe('switching notes', () => {
  it('shows exactly one editor per note on screen', () => {
    const { s, a, b } = setup({ wide: false })
    render(<App />)
    act(() => s().setActive(a))
    act(() => s().setActive(b))
    expect(document.querySelectorAll('.cm-editor')).toHaveLength(1)
    act(() => s().setSplitNote(a))
    expect(document.querySelectorAll('.cm-editor')).toHaveLength(1)
  })

  it('Change format… applies to the side note while it has the cursor', async () => {
    const { s, a, b } = setup()
    act(() => s().setSplitNote(a))
    render(<App />)
    act(() => s().setUi({ sideFocused: true, paletteOpen: true, paletteMode: 'formats' }))
    const dialog = await screen.findByRole('dialog', { name: /command palette/i })
    const user = userEvent.setup()
    await user.type(within(dialog).getByRole('combobox'), 'python')
    await user.keyboard('{Enter}')
    expect(s().notes[a].language).toBe('python')
    expect(s().notes[b].language).toBe('auto')
  })

  it('Ctrl+/ in a code note shown beside a plain one comments the line', async () => {
    const { s, b } = setup()
    const code = s().newNote({ content: 'let x = 1', language: 'javascript' })
    act(() => s().setActive(b))
    act(() => s().setSplitNote(code))
    render(<App />)
    const side = pane()!
    const content = side.querySelector('.cm-content') as HTMLElement
    const view = EditorView.findFromDOM(side.querySelector('.cm-editor') as HTMLElement)!
    act(() => view.dispatch({ selection: { anchor: 0 } }))
    act(() => view.focus())
    const user = userEvent.setup()
    await user.click(content)
    await user.keyboard('{Control>}/{/Control}')
    expect(screen.queryByRole('dialog', { name: /keyboard shortcuts/i })).toBeNull()
    expect(s().notes[code].content).toBe('// let x = 1')
  })
})

describe('working in the side note', () => {
  it('switching its view keeps commands on the side note, and returns the cursor to it', () => {
    const { s, a, b } = setup()
    act(() => s().setNoteMode(a, 'markdown'))
    act(() => s().setSplitNote(a))
    render(<App />)
    const sideEditor = () => pane()!.querySelector('.cm-content') as HTMLElement | null
    act(() => sideEditor()!.focus())
    expect(s().ui.sideFocused).toBe(true)
    const cycle = COMMANDS.find((c) => c.id === 'view.preview.cycle')!
    act(() => cycle.run({ store: getStore() })) // edit → split
    expect(s().session.perTab[a]?.previewMode).toBe('split')
    expect(s().ui.sideFocused).toBe(true)
    act(() => cycle.run({ store: getStore() })) // split → preview
    expect(s().session.perTab[a]?.previewMode).toBe('preview')
    expect(s().ui.sideFocused).toBe(true)
    act(() => cycle.run({ store: getStore() })) // preview → edit, still the side note
    expect(s().session.perTab[a]?.previewMode).toBe('edit')
    expect(s().session.perTab[b]?.previewMode ?? 'edit').toBe('edit')
    expect(sideEditor()!.contains(document.activeElement)).toBe(true)
    // And note commands still mean the side note.
    act(() => COMMANDS.find((c) => c.id === 'note.trash')!.run({ store: getStore() }))
    expect(s().notes[a].deletedAt).not.toBeNull()
    expect(s().notes[b].deletedAt).toBeNull()
  })

  it('with the side note in Preview, the toolbar and palette leave the main note alone', async () => {
    const { s, a, b } = setup()
    act(() => s().setNoteMode(a, 'markdown'))
    act(() => s().setSplitNote(a))
    render(<App />)
    act(() => (pane()!.querySelector('.cm-content') as HTMLElement).focus())
    const cycle = COMMANDS.find((c) => c.id === 'view.preview.cycle')!
    act(() => cycle.run({ store: getStore() })) // split
    act(() => cycle.run({ store: getStore() })) // preview: the side note has no editor now
    // Its toolbar has nothing to act on…
    expect(screen.getByRole('button', { name: 'Bold' })).toBeDisabled()
    // …and a transform from the palette doesn't reach the main note either.
    const encode = COMMANDS.find((c) => c.id === 'text.base64.encode')!
    await act(async () => encode.run({ store: getStore() }))
    expect(s().notes[b].content).toBe('beta text')
  })

  it('once the side note is hidden (zen), commands go back to the main note', () => {
    const { s, a, b } = setup()
    act(() => s().setSplitNote(a))
    render(<App />)
    act(() => (pane()!.querySelector('.cm-content') as HTMLElement).focus())
    expect(s().ui.sideFocused).toBe(true)
    act(() => s().toggleZen())
    expect(s().ui.sideFocused).toBe(false)
    act(() => COMMANDS.find((c) => c.id === 'note.trash')!.run({ store: getStore() }))
    expect(s().notes[b].deletedAt).not.toBeNull()
    expect(s().notes[a].deletedAt).toBeNull()
  })
})

describe('opening a note beside another', () => {
  it('is offered only where two notes fit side by side (900px and up)', () => {
    const { s } = setup({ wide: false })
    const open = COMMANDS.find((c) => c.id === 'view.split.open')!
    expect(s().session.openTabIds.length).toBeGreaterThan(1)
    expect(commandEnabled(open, s())).toBe(false)
    media?.set({ wide: true })
    expect(commandEnabled(open, s())).toBe(true)
  })
})
