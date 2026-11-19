import { act, render, waitFor } from '@testing-library/react'
import { foldable, language } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { describe, expect, it } from 'vitest'
import type { LanguageId } from '../../domain/types'
import { createAppStore, initStore } from '../../store/store'
import { Editor } from './Editor'

async function setup(lang: LanguageId, content: string) {
  const store = initStore(createAppStore())
  const id = store.getState().newNote()
  store.getState().updateContent(id, content)
  store.getState().setLanguage(id, lang)
  const { container } = render(<Editor noteId={id} />)
  const view = EditorView.findFromDOM(container.querySelector('.cm-editor') as HTMLElement)!
  // The language loads lazily; wait until the editor has it.
  if (lang !== 'plaintext') await waitFor(() => expect(view.state.facet(language)).not.toBeNull())
  return { view, container }
}

/** Types one character the way the browser does, through the editor's input handlers. */
function typeChar(view: EditorView, ch: string) {
  const { from, to } = view.state.selection.main
  const insert = () => view.state.update({ changes: { from, to, insert: ch } })
  act(() => {
    const handled = view.state
      .facet(EditorView.inputHandler)
      .some((h) => h(view, from, to, ch, insert))
    if (!handled) view.dispatch(insert())
  })
}

describe('code notes', () => {
  it('close brackets and quotes as you type', async () => {
    const { view } = await setup('javascript', 'f')
    act(() => view.dispatch({ selection: { anchor: 1 } }))
    typeChar(view, '(')
    expect(view.state.doc.toString()).toBe('f()')
    typeChar(view, '"')
    expect(view.state.doc.toString()).toBe('f("")')
  })

  it('can fold a block', async () => {
    const { view, container } = await setup('javascript', 'function a() {\n  go()\n}')
    expect(container.querySelector('.cm-foldGutter')).not.toBeNull()
    expect(foldable(view.state, 0, view.state.doc.line(1).to)).not.toBeNull()
  })

  it('highlight the bracket matching the one at the cursor', async () => {
    const { view, container } = await setup('javascript', 'f(x)')
    act(() => view.dispatch({ selection: { anchor: 1 } }))
    await waitFor(() => expect(container.querySelectorAll('.cm-matchingBracket')).toHaveLength(2))
  })
})

describe('plain text notes', () => {
  it('type brackets as they are, with no fold gutter', async () => {
    const { view, container } = await setup('plaintext', 'f')
    act(() => view.dispatch({ selection: { anchor: 1 } }))
    typeChar(view, '(')
    expect(view.state.doc.toString()).toBe('f(')
    expect(container.querySelector('.cm-foldGutter')).toBeNull()
  })
})
