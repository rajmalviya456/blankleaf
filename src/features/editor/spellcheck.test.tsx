import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { StatusBar } from '../../app/layout/StatusBar'
import { COMMANDS } from '../../commands/registry'
import { carryOverSpellcheck } from '../../domain/defaults'
import { createAppStore, initStore } from '../../store/store'
import { Editor } from './Editor'

function setup() {
  const store = initStore(createAppStore())
  const s = () => store.getState()
  const id = s().newNote()
  return { store, s, id }
}

describe('spell check, one switch for every note', () => {
  it('is off by default, and once on stays on for every note', () => {
    const { s, id } = setup()
    expect(s().settings.spellcheck).toBe(false)
    const { container } = render(<Editor noteId={id} />)
    const content = () => container.querySelector('.cm-content')!
    act(() => s().toggleSpellcheck())
    expect(s().settings.spellcheck).toBe(true)
    s().newNote()
    expect(s().settings.spellcheck).toBe(true)
    // Blankleaf checks spelling itself; the browser's own check stays off either way.
    expect(content()).toHaveAttribute('spellcheck', 'false')
  })

  it('has a status bar switch that applies to all notes', async () => {
    const { s } = setup()
    render(<StatusBar />)
    await userEvent.click(screen.getByRole('button', { name: 'Spelling: off' }))
    expect(s().settings.spellcheck).toBe(true)
    expect(screen.getByRole('button', { name: 'Spelling: on' })).toBeInTheDocument()
    act(() => void s().newNote())
    expect(screen.getByRole('button', { name: 'Spelling: on' })).toBeInTheDocument()
  })

  it('is a palette command', () => {
    const { store, s } = setup()
    COMMANDS.find((c) => c.id === 'view.spellcheck')!.run({ store })
    expect(s().settings.spellcheck).toBe(true)
  })

  it('starts on for people who had it on for any note before', () => {
    const notes = [{ spellcheck: true }, {}]
    expect(carryOverSpellcheck(undefined, notes)).toBe(true)
    expect(carryOverSpellcheck(undefined, [{}])).toBe(false)
    // Once the app-wide switch has been saved, it wins.
    expect(carryOverSpellcheck({ spellcheck: false }, notes)).toBe(false)
  })
})
