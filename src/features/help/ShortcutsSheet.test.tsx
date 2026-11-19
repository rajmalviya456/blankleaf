import { render, screen, within } from '@testing-library/react'
import { act } from 'react'
import { expect, it } from 'vitest'
import { createAppStore, initStore } from '../../store/store'
import { ShortcutsSheet } from './ShortcutsSheet'

it('lists the editor’s own keys, including the code ones', async () => {
  const store = initStore(createAppStore())
  render(<ShortcutsSheet />)
  act(() => store.getState().setUi({ shortcutsOpen: true }))
  const editor = within(await screen.findByRole('region', { name: 'In the editor' }))
  for (const name of [
    'Find and replace',
    'Go to line',
    'Select next match',
    'Comment line (code notes)',
    'Fold or unfold block (code notes)',
    'Indent / outdent',
  ])
    expect(editor.getByText(name)).toBeInTheDocument()
  // jsdom isn't a Mac: Ctrl, not ⌘.
  expect(editor.getByText('Ctrl+/')).toBeInTheDocument()
})
