import { act, render, waitFor } from '@testing-library/react'
import { EditorView } from '@codemirror/view'
import { createAppStore, initStore } from '../../store/store'
import { Editor } from './Editor'

function setup(language: 'markdown' | 'plaintext', live = true) {
  const store = initStore(createAppStore())
  const s = () => store.getState()
  s().updateSettings({ liveMarkdown: live })
  const id = s().newNote()
  s().updateContent(id, '**bold** text\n\nend')
  s().setLanguage(id, language)
  s().setViewState(id, { anchor: 18, head: 18 })
  const utils = render(<Editor noteId={id} />)
  const view = EditorView.findFromDOM(utils.container.querySelector('.cm-editor') as HTMLElement)!
  const first = () => view.contentDOM.querySelector('.cm-line')?.textContent
  return { s, view, first }
}

describe('Editor: formatted while you type', () => {
  it('Markdown notes hide the marks once loaded', async () => {
    const { first } = setup('markdown')
    await waitFor(() => expect(first()).toBe('bold text'))
  })

  it('the setting turns it off', async () => {
    const { first, s, view } = setup('markdown', false)
    await waitFor(() => expect(view.contentDOM.querySelector('.cm-line')).not.toBeNull())
    await new Promise((r) => setTimeout(r, 50))
    expect(first()).toBe('**bold** text')
    act(() => s().updateSettings({ liveMarkdown: true }))
    await waitFor(() => expect(first()).toBe('bold text'))
  })

  it('plain notes are never decorated', async () => {
    const { first } = setup('plaintext')
    await new Promise((r) => setTimeout(r, 50))
    expect(first()).toBe('**bold** text')
  })
})
