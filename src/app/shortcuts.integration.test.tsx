import { language } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { COMMANDS } from '../commands/registry'
import { createAppStore, getStore, initStore } from '../store/store'
import { App } from './App'

// jsdom reports a non-Mac platform: mod = Ctrl, Mod2 = Alt.
function setup() {
  const store = initStore(createAppStore())
  const id = store.getState().newNote()
  store.getState().updateContent(id, 'first note')
  render(<App />)
  return { id, s: () => store.getState(), user: userEvent.setup() }
}
const press = (code: string, mods: Partial<KeyboardEvent> = {}) =>
  act(() => void fireEvent.keyDown(window, { code, key: code, ...mods }))

describe('global shortcuts', () => {
  it('Alt+N creates a note and Alt+W closes it', () => {
    const { s } = setup()
    press('KeyN', { altKey: true })
    expect(s().session.openTabIds).toHaveLength(2)
    press('KeyW', { altKey: true })
    expect(s().session.openTabIds).toHaveLength(1)
  })

  it('note shortcuts do nothing while a dialog is open', async () => {
    const { s, id } = setup()
    press('Comma', { ctrlKey: true })
    await screen.findByRole('dialog', { name: 'Settings' })
    press('KeyN', { altKey: true })
    expect(s().session.openTabIds).toHaveLength(1)
    press('KeyW', { altKey: true })
    expect(s().session.openTabIds).toHaveLength(1)
    expect(s().notes[id]).toBeDefined()
  })

  it('searching or showing Trash from zen leaves zen so the sidebar shows', () => {
    const { s } = setup()
    act(() => s().toggleZen())
    press('KeyF', { ctrlKey: true, shiftKey: true })
    expect(s().session.zen).toBe(false)
    expect(s().session.sidebar).toEqual({ open: true, panel: 'search' })
    act(() => s().toggleZen())
    const trash = COMMANDS.find((c) => c.id === 'view.trash')!
    act(() => trash.run({ store: getStore() }))
    expect(s().session.zen).toBe(false)
    expect(s().session.sidebar).toEqual({ open: true, panel: 'trash' })
  })

  it('Ctrl+B in a Markdown note bolds instead of toggling the sidebar', async () => {
    const { s, id } = setup()
    act(() => s().setLanguage(id, 'markdown'))
    const content = document.querySelector('.cm-content') as HTMLElement
    const view = EditorView.findFromDOM(content)!
    await waitFor(() => expect(view.state.facet(language)?.name).toBe('markdown'))
    act(() => view.dispatch({ selection: { anchor: 0, head: 5 } }))
    act(
      () => void fireEvent.keyDown(content, { code: 'KeyB', key: 'b', keyCode: 66, ctrlKey: true }),
    )
    expect(s().session.sidebar.open).toBe(false)
    expect(view.state.doc.toString()).toBe('**first** note')
  })

  it('Ctrl+B typed in a plain note still toggles the sidebar', () => {
    const { s } = setup()
    const content = document.querySelector('.cm-content') as HTMLElement
    act(
      () => void fireEvent.keyDown(content, { code: 'KeyB', key: 'b', keyCode: 66, ctrlKey: true }),
    )
    expect(s().session.sidebar.open).toBe(true)
  })

  it('AltGr (Ctrl+Alt) does nothing', () => {
    const { s } = setup()
    press('KeyN', { altKey: true, ctrlKey: true })
    expect(s().session.openTabIds).toHaveLength(1)
  })

  it('Ctrl+B toggles the sidebar and Ctrl+Shift+F opens search', () => {
    const { s } = setup()
    press('KeyB', { ctrlKey: true })
    expect(s().session.sidebar.open).toBe(true)
    press('KeyF', { ctrlKey: true, shiftKey: true })
    expect(s().session.sidebar).toEqual({ open: true, panel: 'search' })
  })

  it('F2 starts renaming the active tab', async () => {
    setup()
    press('F2')
    expect(await screen.findByRole('textbox', { name: /rename/i })).toBeInTheDocument()
  })

  it('Ctrl+, opens settings', async () => {
    setup()
    press('Comma', { ctrlKey: true })
    expect(await screen.findByRole('dialog', { name: /settings/i })).toBeInTheDocument()
  })

  it('closing a pinned tab by shortcut asks to unpin', async () => {
    const { s, id } = setup()
    act(() => s().togglePin(id))
    press('KeyW', { altKey: true })
    expect(await screen.findByRole('alertdialog')).toHaveTextContent(/unpin/i)
  })
})

describe('Ctrl+/', () => {
  it('opens the shortcuts list from outside the editor', async () => {
    setup()
    press('Slash', { ctrlKey: true, key: '/' })
    expect(await screen.findByRole('dialog', { name: /shortcuts/i })).toBeInTheDocument()
  })

  it('toggles a comment inside a code note instead', async () => {
    const { s, id } = setup()
    act(() => {
      s().updateContent(id, 'let x = 1')
      s().setLanguage(id, 'javascript')
    })
    const editor = await screen.findByRole('textbox', { name: 'Note text' })
    await vi.waitFor(() =>
      expect(document.querySelector('.cm-line .tok-keyword, .cm-line span')).not.toBeNull(),
    )
    act(() => void fireEvent.keyDown(editor, { code: 'Slash', key: '/', ctrlKey: true }))
    expect(screen.queryByRole('dialog', { name: /shortcuts/i })).toBeNull()
    expect(s().notes[id].content).toBe('// let x = 1')
  })
})

describe('zen mode', () => {
  it('Ctrl+. hides the chrome and Escape brings it back', () => {
    const { s } = setup()
    press('Period', { ctrlKey: true })
    expect(s().session.zen).toBe(true)
    expect(screen.queryByRole('tablist')).toBeNull()
    expect(screen.queryByRole('contentinfo', { name: /status bar/i })).toBeNull()
    expect(screen.getByText(/to exit zen/i)).toBeInTheDocument()
    act(() => void fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' }))
    expect(s().session.zen).toBe(false)
    expect(screen.getByRole('tablist')).toBeInTheDocument()
  })
})

describe('command palette', () => {
  it('⌘K opens palette; typing "zen" and Enter toggles zen', async () => {
    const { s, user } = setup()
    press('KeyK', { ctrlKey: true })
    const dialog = await screen.findByRole('dialog', { name: /command palette/i })
    await user.type(within(dialog).getByRole('combobox'), 'zen')
    await user.keyboard('{Enter}')
    expect(s().session.zen).toBe(true)
    expect(screen.queryByRole('dialog', { name: /command palette/i })).toBeNull()
  })

  it('ranks a command whose words match ahead of loose matches', async () => {
    const { user } = setup()
    press('KeyK', { ctrlKey: true })
    const dialog = await screen.findByRole('dialog', { name: /command palette/i })
    await user.type(within(dialog).getByRole('combobox'), 'spell')
    expect(within(dialog).getAllByRole('option')[0]).toHaveTextContent('Toggle spell check')
  })

  it('typing a note title lists it and Enter opens it', async () => {
    const { s, user } = setup()
    const other = s().newNote()
    act(() => s().updateContent(other, 'grocery list'))
    act(() => s().closeTab(other))
    press('KeyK', { ctrlKey: true })
    const dialog = await screen.findByRole('dialog', { name: /command palette/i })
    await user.type(within(dialog).getByRole('combobox'), 'grocery')
    expect(within(dialog).getByRole('option', { name: /grocery list/i })).toBeInTheDocument()
    await user.keyboard('{Enter}')
    expect(s().session.activeTabId).toBe(other)
  })

  it('shows shortcuts next to commands', async () => {
    setup()
    press('KeyK', { ctrlKey: true })
    const dialog = await screen.findByRole('dialog', { name: /command palette/i })
    expect(within(dialog).getByRole('option', { name: /new note/i })).toHaveTextContent('Alt+N')
  })

  it('Change format… lists formats and applies one', async () => {
    const { s, id, user } = setup()
    press('KeyK', { ctrlKey: true })
    const dialog = await screen.findByRole('dialog', { name: /command palette/i })
    await user.type(within(dialog).getByRole('combobox'), 'change format')
    await user.keyboard('{Enter}')
    await user.type(within(dialog).getByRole('combobox'), 'python')
    await user.keyboard('{Enter}')
    expect(s().notes[id].language).toBe('python')
  })

  it('Ctrl+/ opens the shortcuts sheet', async () => {
    setup()
    press('Slash', { ctrlKey: true })
    const sheet = await screen.findByRole('dialog', { name: /keyboard shortcuts/i })
    expect(sheet).toHaveTextContent('Ctrl+Shift+F')
  })
})

describe('installed app shortcuts', () => {
  it('Ctrl+T is ignored in a browser tab but opens a note in the installed app', () => {
    const { s } = setup()
    press('KeyT', { ctrlKey: true })
    expect(s().session.openTabIds).toHaveLength(1)
    const mm = window.matchMedia
    window.matchMedia = ((q: string) => ({
      matches: q.includes('standalone'),
      media: q,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
    })) as unknown as typeof mm
    press('KeyT', { ctrlKey: true })
    expect(s().session.openTabIds).toHaveLength(2)
    window.matchMedia = mm
  })
})
