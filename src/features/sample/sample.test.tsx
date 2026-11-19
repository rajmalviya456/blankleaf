import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App } from '../../app/App'
import { COMMANDS } from '../../commands/registry'
import { createAppStore, initStore } from '../../store/store'
import { SAMPLE_NOTE, SAMPLE_HINT_KEY } from './sample'

function setup(content = '') {
  const store = initStore(createAppStore())
  const id = store.getState().newNote()
  if (content) store.getState().updateContent(id, content)
  render(<App />)
  return { id, s: () => store.getState(), user: userEvent.setup() }
}

beforeEach(() => localStorage.removeItem(SAMPLE_HINT_KEY))
afterEach(() => localStorage.removeItem(SAMPLE_HINT_KEY))

describe('sample note', () => {
  it('shows Markdown, a diagram, code, math and a checklist', () => {
    for (const part of ['# ', '**', '- [ ]', '```mermaid', '```js', '```python', '$$', '| '])
      expect(SAMPLE_NOTE).toContain(part)
  })

  it('an empty page offers it, and it opens beside its preview', async () => {
    const { s, user } = setup()
    await user.click(await screen.findByRole('button', { name: 'Try a sample note' }))
    const id = s().session.activeTabId!
    expect(s().notes[id]).toMatchObject({ content: SAMPLE_NOTE, mode: 'markdown' })
    expect(s().session.perTab[id]?.previewMode).toBe('split')
  })

  it('is not offered once the note has text', async () => {
    const { s, id } = setup()
    await screen.findByRole('button', { name: 'Try a sample note' })
    act(() => s().updateContent(id, 'hello'))
    expect(screen.queryByRole('button', { name: 'Try a sample note' })).toBeNull()
  })

  it('can be dismissed for good', async () => {
    const { user } = setup()
    await user.click(await screen.findByRole('button', { name: 'Hide the sample note offer' }))
    expect(screen.queryByRole('button', { name: 'Try a sample note' })).toBeNull()
    expect(localStorage.getItem(SAMPLE_HINT_KEY)).toBe('hidden')
  })

  it('is not offered to people who already have notes', () => {
    const store = initStore(createAppStore())
    for (const t of ['a', 'b', 'c']) store.getState().updateContent(store.getState().newNote(), t)
    store.getState().newNote()
    render(<App />)
    expect(screen.queryByRole('button', { name: 'Try a sample note' })).toBeNull()
  })

  it('is in the command palette', () => {
    expect(COMMANDS.find((c) => c.id === 'help.sample')?.title).toBe('Open sample note')
  })
})
