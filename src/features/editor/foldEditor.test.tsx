import { act, render, waitFor } from '@testing-library/react'
import { foldCode, foldedRanges, language } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { describe, expect, it } from 'vitest'
import { createAppStore, initStore } from '../../store/store'
import { Editor } from './Editor'

const viewIn = (el: HTMLElement) =>
  EditorView.findFromDOM(el.querySelector('.cm-editor') as HTMLElement)!

const foldCount = (v: EditorView) => foldedRanges(v.state).size

async function noteEditor(content: string, lang: 'markdown') {
  const store = initStore(createAppStore())
  const s = () => store.getState()
  const id = s().newNote()
  s().updateContent(id, content)
  s().setLanguage(id, lang)
  const utils = render(<Editor noteId={id} />)
  const view = viewIn(utils.container)
  await waitFor(() => expect(view.state.facet(language)?.name).toBe(lang))
  return { id, utils, view }
}

describe('collapsing sections in the editor', () => {
  it('Markdown notes get fold arrows', async () => {
    const { view } = await noteEditor('# One\ntext\n# Two\nmore', 'markdown')
    expect(view.dom.querySelector('.cm-foldGutter .cm-md-fold')).not.toBeNull()
  })

  it('a collapsed section stays collapsed when the note is opened again', async () => {
    const { id, utils, view } = await noteEditor('# One\ntext\n# Two\nmore', 'markdown')
    act(() => void foldCode(view))
    expect(foldCount(view)).toBe(1)
    utils.unmount()
    const again = render(<Editor noteId={id} />)
    const v2 = viewIn(again.container)
    await waitFor(() => expect(v2.state.facet(language)?.name).toBe('markdown'))
    expect(foldCount(v2)).toBe(1)
  })
})
