import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from '../../app/App'
import { createAppStore, initStore } from '../../store/store'

const PYTHON = 'import os\n\ndef main():\n    print(os.getcwd())\n'

function setup() {
  const store = initStore(createAppStore())
  const id = store.getState().newNote()
  render(<App />)
  return { id, s: () => store.getState(), user: userEvent.setup() }
}

describe('after auto-detect picks a format', () => {
  it('says what it picked, and Undo makes the note plain text for good', async () => {
    const { id, s, user } = setup()
    act(() => s().updateContent(id, PYTHON))
    const chip = await screen.findByRole('status', { name: 'Format detected' })
    expect(chip).toHaveTextContent('Detected Python')
    await user.click(screen.getByRole('button', { name: 'Undo: make this plain text' }))
    expect(s().notes[id].language).toBe('plaintext')
    expect(screen.queryByRole('status', { name: 'Format detected' })).toBeNull()
    // Plain text was a choice: more code doesn't switch it back.
    act(() => s().updateContent(id, PYTHON + '\nimport sys\n'))
    await new Promise((r) => setTimeout(r, 50))
    expect(s().notes[id].language).toBe('plaintext')
  })

  it('goes away when the format is picked by hand', async () => {
    const { id, s } = setup()
    act(() => s().updateContent(id, PYTHON))
    await screen.findByRole('status', { name: 'Format detected' })
    act(() => s().setLanguage(id, 'ruby'))
    expect(screen.queryByRole('status', { name: 'Format detected' })).toBeNull()
  })

  it('can be closed', async () => {
    const { id, s, user } = setup()
    act(() => s().updateContent(id, PYTHON))
    await screen.findByRole('status', { name: 'Format detected' })
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('status', { name: 'Format detected' })).toBeNull()
    expect(s().notes[id].language).toBe('python')
  })

  it('isn’t shown for a format chosen by hand', async () => {
    const { id, s } = setup()
    act(() => {
      s().setLanguage(id, 'python')
      s().updateContent(id, PYTHON)
    })
    await new Promise((r) => setTimeout(r, 50))
    expect(screen.queryByRole('status', { name: 'Format detected' })).toBeNull()
  })
})
