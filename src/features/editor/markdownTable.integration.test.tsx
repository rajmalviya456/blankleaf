import { act, render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditorView } from '@codemirror/view'
import { describe, expect, it } from 'vitest'
import { createAppStore, initStore } from '../../store/store'
import { Editor } from './Editor'

describe('tables in a Markdown note', () => {
  it('Tab tidies the table and moves to the next cell', async () => {
    const store = initStore(createAppStore())
    const s = () => store.getState()
    const id = s().newNote({
      content: '|a|b|\n|-|-|\n|1|2|',
      mode: 'markdown',
      language: 'markdown',
    })
    const { container } = render(<Editor noteId={id} />)
    const view = EditorView.findFromDOM(container.querySelector('.cm-editor') as HTMLElement)!
    const user = userEvent.setup()
    act(() => {
      view.focus()
      view.dispatch({ selection: { anchor: 1 } })
    })
    // The table keys come with the Markdown support, which loads on demand.
    await waitFor(() =>
      expect(container.querySelector('.cm-content')).toHaveAttribute('data-language', 'markdown'),
    )
    await user.keyboard('{Tab}')
    expect(s().notes[id].content).toBe('| a   | b   |\n| --- | --- |\n| 1   | 2   |')
    expect(view.state.selection.main.head).toBe(8)
  })
})
