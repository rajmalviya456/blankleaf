import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditorView } from '@codemirror/view'
import { describe, expect, it } from 'vitest'
import { App } from '../../app/App'
import { createAppStore, initStore } from '../../store/store'

function setup(content: string) {
  const store = initStore(createAppStore())
  const s = () => store.getState()
  const plan = s().newNote({ title: 'Plan', content: 'the plan' })
  const id = s().newNote({ content })
  s().setLanguage(id, 'plaintext')
  render(<App />)
  const view = () => EditorView.findFromDOM(document.querySelector('.cm-editor') as HTMLElement)!
  return { s, id, plan, view, user: userEvent.setup() }
}

describe('links between notes in the editor', () => {
  it('styles [[Title]] as a link', async () => {
    setup('See [[Plan]] today')
    await waitFor(() =>
      expect(document.querySelector('.np-note-link')?.textContent).toBe('[[Plan]]'),
    )
  })

  it('offers to open the linked note when the cursor is in the link', async () => {
    const { s, plan, view, user } = setup('See [[Plan]] today')
    act(() => view().dispatch({ selection: { anchor: 7 } }))
    await user.click(await screen.findByRole('button', { name: 'Open “Plan”' }))
    expect(s().session.activeTabId).toBe(plan)
  })

  it('offers to create a note the link points at but doesn’t exist yet', async () => {
    const { s, view, user } = setup('See [[Ideas]] today')
    act(() => view().dispatch({ selection: { anchor: 7 } }))
    await user.click(await screen.findByRole('button', { name: 'Create “Ideas”' }))
    const active = s().notes[s().session.activeTabId!]
    expect(active.title).toBe('Ideas')
  })

  it('suggests note titles after [[ and fills one in', async () => {
    const { s, id, view } = setup('')
    act(() => {
      view().focus()
      view().dispatch({ changes: { from: 0, insert: '[' }, selection: { anchor: 1 } })
    })
    // Typed the browser's way, so the editor's input handlers see it.
    act(() => {
      const v = view()
      const tr = () =>
        v.state.update({ changes: { from: 1, insert: '[' }, selection: { anchor: 2 } })
      if (!v.state.facet(EditorView.inputHandler).some((h) => h(v, 1, 1, '[', tr))) v.dispatch(tr())
    })
    const option = await screen.findByRole('option', { name: /Plan/ })
    await userEvent.setup().click(option)
    await waitFor(() => expect(s().notes[id].content).toBe('[[Plan]]'))
  })
})

describe('links between notes in the preview', () => {
  it('opens the linked note when clicked', async () => {
    const store = initStore(createAppStore())
    const s = () => store.getState()
    const plan = s().newNote({ title: 'Plan', content: 'the plan' })
    const id = s().newNote({
      content: '# Notes\n\nSee [[Plan]].',
      mode: 'markdown',
      language: 'markdown',
    })
    s().setViewState(id, { previewMode: 'preview' })
    render(<App />)
    await userEvent.setup().click(await screen.findByRole('link', { name: 'Plan' }))
    expect(s().session.activeTabId).toBe(plan)
  })
})

describe('links with Markdown inside them in the preview', () => {
  it('still link when the title has *stars* or __underscores__, and open the right note', async () => {
    const store = initStore(createAppStore())
    const s = () => store.getState()
    const target = s().newNote({ title: 'a *big* plan', content: 'x' })
    const id = s().newNote({
      content: 'See [[a *big* plan]] now.',
      mode: 'markdown',
      language: 'markdown',
    })
    s().setViewState(id, { previewMode: 'preview' })
    render(<App />)
    const link = await screen.findByRole('link', { name: 'a big plan' })
    expect(link.querySelector('em')).not.toBeNull()
    await userEvent.setup().click(link)
    expect(s().session.activeTabId).toBe(target)
  })
})

describe('Linked from', () => {
  it('lists the notes that link here and opens one', async () => {
    const store = initStore(createAppStore())
    const s = () => store.getState()
    const a = s().newNote({ title: 'Journal', content: 'Journal\nworked on [[Plan]]' })
    s().newNote({ title: 'Plan', content: 'the plan' })
    render(<App />)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Linked from 1 note' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Journal' }))
    expect(s().session.activeTabId).toBe(a)
  })
})
