import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { fireEvent } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from '../../app/App'
import { COMMANDS, commandEnabled } from '../../commands/registry'
import { createAppStore, initStore } from '../../store/store'
import { toastStore } from '../../ui/toast'

function setup(content: string, language: 'sql' | 'python' | 'javascript') {
  const store = initStore(createAppStore())
  const s = () => store.getState()
  const id = s().newNote({ content })
  act(() => s().setLanguage(id, language))
  render(<App />)
  return { s, id, user: userEvent.setup() }
}

describe('Format code in the app', () => {
  it('is in the Transform menu for SQL and formats the note', async () => {
    const { s, id, user } = setup('select a,b from t', 'sql')
    await user.click(screen.getByRole('button', { name: 'Transform' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Format SQL' }))
    await waitFor(() => expect(s().notes[id].content).toBe('SELECT\n  a,\n  b\nFROM\n  t'))
  })

  it('Shift+Alt+F formats, and bad code gets a message instead', async () => {
    const { s, id } = setup('let x = (', 'javascript')
    act(
      () =>
        void fireEvent.keyDown(window, { code: 'KeyF', key: 'F', altKey: true, shiftKey: true }),
    )
    await waitFor(() =>
      expect(toastStore.getState().toasts.at(-1)?.msg).toMatch(/^Couldn’t format:/),
    )
    expect(s().notes[id].content).toBe('let x = (')
  })

  it('isn’t offered for formats it can’t do', async () => {
    const { s, user } = setup('print( 1 )', 'python')
    expect(
      commandEnabled(
        COMMANDS.find((c) => c.id === 'text.formatCode')!,
        s(),
      ),
    ).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Transform' }))
    expect(screen.queryByRole('menuitem', { name: /^Format Python/ })).toBeNull()
  })
})
