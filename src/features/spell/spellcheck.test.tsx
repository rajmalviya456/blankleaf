import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditorView, runScopeHandlers } from '@codemirror/view'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAppStore, initStore } from '../../store/store'
import { Editor } from '../editor/Editor'
import { setSpellServiceForTests, type SpellService } from './spellService'

const KNOWN = new Set(['i', 'saw', 'the', 'cat', 'sat', 'on', 'mat', 'hello'])
let added: string[]
function fakeService(): SpellService {
  added = []
  return {
    check: async (words) => new Set(words.filter((w) => !KNOWN.has(w.toLowerCase()))),
    suggest: async (word) => (word === 'teh' ? ['the', 'ten'] : []),
    add: (word) => {
      added.push(word)
      KNOWN.add(word.toLowerCase())
    },
  }
}

beforeEach(() => setSpellServiceForTests(fakeService()))
afterEach(() => setSpellServiceForTests(null))

function setup(content: string, spellcheck = true) {
  const store = initStore(createAppStore())
  const s = () => store.getState()
  s().updateSettings({ spellcheck })
  const id = s().newNote({ content })
  const { container } = render(<Editor noteId={id} />)
  const view = EditorView.findFromDOM(container.querySelector('.cm-editor') as HTMLElement)!
  return { s, id, view, container }
}

const marked = (container: HTMLElement) =>
  [...container.querySelectorAll('.np-misspelled')].map((e) => e.textContent)

/** A click inside the word, the way the editor sees a pointer selection. */
const clickInside = (view: EditorView, pos: number) =>
  act(() => view.dispatch({ selection: { anchor: pos }, userEvent: 'select.pointer' }))

describe('spell check', () => {
  it('underlines misspelled words, not code or the browser’s own guesses', async () => {
    const { container } = setup('I saw teh cat. `npm instal` sat on the mat.')
    await waitFor(() => expect(marked(container)).toEqual(['teh']))
    expect(container.querySelector('.cm-content')).toHaveAttribute('spellcheck', 'false')
  })

  it('does nothing while it’s off', async () => {
    const { container } = setup('I saw teh cat', false)
    await new Promise((r) => setTimeout(r, 400))
    expect(marked(container)).toEqual([])
  })

  it('leaves the word being typed alone until the cursor moves on', async () => {
    const { view, container } = setup('I saw the cat', true)
    act(() => {
      view.focus()
      view.dispatch({ changes: { from: 13, insert: ' helo' }, selection: { anchor: 18 } })
    })
    await new Promise((r) => setTimeout(r, 400))
    expect(marked(container)).toEqual([])
    act(() => view.dispatch({ changes: { from: 18, insert: ' ' }, selection: { anchor: 19 } }))
    await waitFor(() => expect(marked(container)).toEqual(['helo']))
  })

  it('offers fixes for a misspelled word and applies one', async () => {
    const { s, id, view, container } = setup('I saw teh cat')
    await waitFor(() => expect(marked(container)).toEqual(['teh']))
    clickInside(view, 7)
    await userEvent.click(await screen.findByRole('button', { name: 'the' }))
    expect(s().notes[id].content).toBe('I saw the cat')
    await waitFor(() => expect(marked(container)).toEqual([]))
  })

  it('adds a word to the personal dictionary', async () => {
    const { view, container } = setup('I saw Zorbex')
    await waitFor(() => expect(marked(container)).toEqual(['Zorbex']))
    clickInside(view, 8)
    await userEvent.click(await screen.findByRole('button', { name: 'Add to dictionary' }))
    expect(added).toEqual(['Zorbex'])
    await waitFor(() => expect(marked(container)).toEqual([]))
  })

  it('checks in the background, not on every keystroke', async () => {
    const service = fakeService()
    const check = vi.spyOn(service, 'check')
    setSpellServiceForTests(service)
    const { view } = setup('I saw the cat')
    await waitFor(() => expect(check).toHaveBeenCalledTimes(1))
    act(() => {
      for (const ch of ' and more words here') view.dispatch(view.state.replaceSelection(ch))
    })
    await new Promise((r) => setTimeout(r, 500))
    expect(check.mock.calls.length).toBeLessThanOrEqual(3)
  })
})

describe('spell check language', () => {
  it('checks with the chosen language’s dictionary, switching when the setting changes', async () => {
    const byLang = (known: string[]): SpellService => ({
      check: async (words) => new Set(words.filter((w) => !known.includes(w.toLowerCase()))),
      suggest: async () => [],
      add: () => {},
    })
    setSpellServiceForTests((lang) =>
      lang === 'es' ? byLang(['la', 'casa']) : byLang(['the', 'house']),
    )
    const store = initStore(createAppStore())
    const s = () => store.getState()
    s().updateSettings({ spellLanguage: 'en-US', spellcheck: true })
    const id = s().newNote({ content: '- the house la casa' })
    const { container } = render(<Editor noteId={id} />)
    await waitFor(() => expect(marked(container)).toEqual(['la', 'casa']))
    act(() => s().updateSettings({ spellLanguage: 'es' }))
    await waitFor(() => expect(marked(container)).toEqual(['the', 'house']))
  })

  it('opens the fixes from the keyboard, with focus on the first one; Escape goes back', async () => {
    const { s, id, view, container } = setup('I saw teh cat')
    await waitFor(() => expect(marked(container)).toEqual(['teh']))
    act(() => {
      view.focus()
      view.dispatch({ selection: { anchor: 7 } })
    })
    const key = (init: KeyboardEventInit) =>
      act(() => void runScopeHandlers(view, new KeyboardEvent('keydown', init), 'editor'))
    key({ key: 'F10', shiftKey: true })
    const first = await screen.findByRole('button', { name: 'the' })
    await waitFor(() => expect(first).toHaveFocus())
    const user = userEvent.setup()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('button', { name: 'ten' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('group', { name: /spelling/i })).toBeNull()
    expect(view.contentDOM).toHaveFocus()
    // The context menu key opens it too, and Enter applies the fix.
    key({ key: 'ContextMenu' })
    await waitFor(() => expect(screen.getByRole('button', { name: 'the' })).toHaveFocus())
    await user.keyboard('{Enter}')
    expect(s().notes[id].content).toBe('I saw the cat')
    expect(view.contentDOM).toHaveFocus()
  })
})
