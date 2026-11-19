import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from '../../app/App'
import { createAppStore, initStore } from '../../store/store'

function bigNote() {
  let text = '# Big\n\n'
  for (let i = 0; text.length < 40_000; i++)
    text += `## Part ${i}\n\nSome words here.\n\n- [ ] task ${i}\n\n`
  return text
}

describe('preview of a big note', () => {
  it('is drawn in chunks inside one preview', async () => {
    const store = initStore(createAppStore())
    const id = store
      .getState()
      .newNote({ content: bigNote(), mode: 'markdown', language: 'markdown' })
    store.getState().setViewState(id, { previewMode: 'preview' })
    render(<App />)
    const article = await screen.findByRole('article', { name: 'Markdown preview' })
    await waitFor(() => expect(article.querySelectorAll('.md-preview').length).toBeGreaterThan(3))
    expect(screen.getAllByRole('article', { name: 'Markdown preview' })).toHaveLength(1)
  })

  it('ticks the right checklist item in a later chunk', async () => {
    const store = initStore(createAppStore())
    const content = bigNote()
    const id = store.getState().newNote({ content, mode: 'markdown', language: 'markdown' })
    store.getState().setViewState(id, { previewMode: 'preview' })
    render(<App />)
    const article = await screen.findByRole('article', { name: 'Markdown preview' })
    const box = await within(article).findByRole('checkbox', { name: 'task 150' })
    await userEvent.click(box)
    const after = store.getState().notes[id].content
    expect(after).toContain('- [x] task 150\n')
    expect(after.replace('- [x] task 150\n', '- [ ] task 150\n')).toBe(content)
  })

  it('is drawn whole when it uses footnotes', async () => {
    const store = initStore(createAppStore())
    const id = store.getState().newNote({
      content: bigNote() + 'See[^1].\n\n[^1]: note',
      mode: 'markdown',
      language: 'markdown',
    })
    store.getState().setViewState(id, { previewMode: 'preview' })
    render(<App />)
    const article = await screen.findByRole('article', { name: 'Markdown preview' })
    act(() => {})
    expect(article.querySelectorAll('.md-preview .md-preview').length).toBe(0)
    expect(article).toHaveClass('md-preview')
  })
})
