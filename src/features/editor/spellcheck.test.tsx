import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { StatusBar } from '../../app/layout/StatusBar'
import { COMMANDS } from '../../commands/registry'
import { createAppStore, initStore } from '../../store/store'
import { parseBackup } from '../backup/backup'
import { Editor } from './Editor'

function setup() {
  const store = initStore(createAppStore())
  const s = () => store.getState()
  const id = s().newNote()
  return { store, s, id }
}

describe('spell check per note', () => {
  it('is off by default and turns on for that note only', () => {
    const { s, id } = setup()
    const other = s().newNote()
    const { container } = render(<Editor noteId={id} />)
    const content = () => container.querySelector('.cm-content')!
    act(() => s().toggleSpellcheck(id))
    expect(s().notes[id].spellcheck).toBe(true)
    expect(s().notes[other].spellcheck).toBeFalsy()
    // Blankleaf checks spelling itself; the browser's own check stays off either way.
    expect(content()).toHaveAttribute('spellcheck', 'false')
  })

  it('has a status bar switch', async () => {
    const { s, id } = setup()
    render(<StatusBar />)
    await userEvent.click(screen.getByRole('button', { name: 'Spelling: off' }))
    expect(s().notes[id].spellcheck).toBe(true)
    expect(screen.getByRole('button', { name: 'Spelling: on' })).toBeInTheDocument()
  })

  it('is a palette command', () => {
    const { store, s, id } = setup()
    COMMANDS.find((c) => c.id === 'view.spellcheck')!.run({ store })
    expect(s().notes[id].spellcheck).toBe(true)
  })

  it('carries over to duplicates and backups', () => {
    const { s, id } = setup()
    act(() => s().toggleSpellcheck(id))
    const copy = s().duplicateNote(id)
    expect(s().notes[copy].spellcheck).toBe(true)
    const backup = parseBackup(
      JSON.stringify({
        app: 'blankleaf',
        schemaVersion: 1,
        notes: [
          { id: 'a', content: 'x', spellcheck: true },
          { id: 'b', content: 'y' },
        ],
      }),
    )
    expect(backup.notes.map((n) => n.spellcheck)).toEqual([true, undefined])
  })
})
